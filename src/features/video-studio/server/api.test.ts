/* eslint-disable max-lines -- End-to-end API scenarios share a real SQLite fixture rather than mocking the persistence contract. */
/* eslint-disable react-func/max-lines-per-function -- Integration setup and scenarios retain their real SQL and request assertions together. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultSpec, ResolvedVideoManifest } from '../contracts';

import { handleStudio } from './api';
import { capability, sign } from './crypto';
import { manifestHash } from './jobs';
import { StudioEnv } from './runtime';

const { resolved } = vi.hoisted(() => ({ resolved: vi.fn() }));
vi.mock('./content', () => ({ catalog: vi.fn(), resolveManifest: resolved, assetIndex: vi.fn() }));
const fixture: ResolvedVideoManifest = {
  version: '1',
  renderVersion: 'studio-1',
  spec: defaultSpec,
  verses: [],
  fonts: [],
  audio: { url: 'https://audio.qurancdn.com/test.mp3', startMs: 0, endMs: 10000 },
  background: { type: 'color', url: '' },
  durationMs: 10000,
  width: 1080,
  height: 1920,
  fps: 30,
};
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let sqlite: InstanceType<typeof DatabaseSync>;
let env: StudioEnv;
let cookie: string;
const origin = 'https://studio.example.test';
const request = async (
  path: string,
  body?: unknown,
  method = body ? 'POST' : 'GET',
  identity = cookie,
): Promise<Response> =>
  handleStudio(
    new Request(`${origin}/api/video-studio/${path}`, {
      method,
      headers: {
        Origin: origin,
        Cookie: identity ?? '',
        'Content-Type': 'application/json',
        'cf-connecting-ip': '192.0.2.1',
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  );
const internal = async (
  path: string,
  payload: unknown,
  secret = env.STUDIO_SIGNING_SECRET,
): Promise<Response> => {
  const body = JSON.stringify(payload);
  const time = String(Date.now());
  return handleStudio(
    new Request(`${origin}/api/video-studio/internal/${path}`, {
      method: 'POST',
      headers: {
        'x-studio-time': time,
        'x-studio-signature': await sign(secret, `${time}.${body}`),
      },
      body,
    }),
    env,
  );
};
const project = async (): Promise<string> =>
  (await (await request('projects', { spec: defaultSpec })).json()).id;
const job = async (projectId: string, key = crypto.randomUUID()): Promise<Response> =>
  request('jobs', {
    projectId,
    hash: await manifestHash(fixture),
    idempotency: key,
    challenge: 'valid-challenge',
  });

beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  readdirSync('services/video-renderer/migrations')
    .sort()
    .forEach((file) =>
      sqlite.exec(readFileSync(`services/video-renderer/migrations/${file}`, 'utf8')),
    );
  const statement = (sql: string, values: unknown[] = []): unknown => ({
    bind: (...args: unknown[]) => statement(sql, args),
    first: async () => sqlite.prepare(sql).get(...values),
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }),
  });
  const bucket = {
    head: vi.fn().mockResolvedValue({ size: 1000 }),
    delete: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  };
  env = {
    VIDEO_STUDIO_DB: {
      prepare: statement,
      batch: async (items: { run: () => Promise<unknown> }[]) =>
        Promise.all(items.map((s) => s.run())),
    },
    VIDEO_STUDIO_PRIVATE: bucket,
    VIDEO_STUDIO_ASSETS: bucket,
    STUDIO_ENABLED: '1',
    STUDIO_ORIGIN: origin,
    STUDIO_SIGNING_SECRET: 'testing-private-signing-secret-32-characters',
    STUDIO_MODAL_URL: 'https://private.modal.run',
    STUDIO_MODAL_KEY: 'test-key',
    STUDIO_MODAL_SECRET: 'test-secret',
    STUDIO_TURNSTILE_SECRET: 'test-challenge-secret',
    STUDIO_TURNSTILE_SITE_KEY: 'test-public-key',
  } as unknown as StudioEnv;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('siteverify')
        ? Response.json({ success: true, hostname: 'studio.example.test', action: 'video-studio' })
        : Response.json({ callId: 'fc-test123' }),
    ),
  );
  resolved.mockResolvedValue(fixture);
  const session = await request('session', undefined, 'GET', '');
  cookie = session.headers.get('set-cookie').split(';')[0];
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllGlobals();
});

describe('studio ownership and durable jobs', () => {
  it('isolates guest browser sessions and rejects foreign origins', async () => {
    const id = await project();
    expect((await request(`projects/${id}`)).status).toBe(200);
    expect((await request(`projects/${id}`, undefined, 'GET', '')).status).toBe(404);
    const forged = await handleStudio(
      new Request(`${origin}/api/video-studio/projects`, {
        method: 'POST',
        headers: { Origin: 'https://attacker.test', Cookie: cookie },
        body: JSON.stringify({ spec: defaultSpec }),
      }),
      env,
    );
    expect(forged.status).toBe(403);
    expect(forged.headers.get('cache-control')).toContain('no-store');
  });
  it('freezes the manifest and returns the same job for a repeated idempotency key', async () => {
    const id = await project();
    const key = crypto.randomUUID();
    const first = await job(id, key);
    expect(first.status).toBe(202);
    const one = await first.json();
    const second = await job(id, key);
    expect((await second.json()).id).toBe(one.id);
    await request(
      `projects/${id}`,
      { spec: { ...defaultSpec, title: 'Edited afterwards' } },
      'PUT',
    );
    expect(
      JSON.parse(
        sqlite.prepare('SELECT manifest FROM studio_jobs WHERE id=?').get(one.id)
          .manifest as string,
      ).spec.title,
    ).toBe('');
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM studio_jobs').get().n).toBe(1);
  });
  it('enforces a lease, rejects forged callbacks and ignores callbacks from previous attempts', async () => {
    const { id } = await (await job(await project())).json();
    expect((await internal('claim', { jobId: id, attempt: 1 }, 'wrong-secret')).status).toBe(403);
    expect((await internal('claim', { jobId: id, attempt: 1 })).status).toBe(200);
    expect((await internal('claim', { jobId: id, attempt: 1 })).status).toBe(409);
    await internal('finish', {
      jobId: id,
      attempt: 1,
      success: false,
      error: 'TEMPORARY',
      retryable: true,
    });
    expect(
      (await internal('progress', { jobId: id, attempt: 1, status: 'rendering', progress: 90 }))
        .status,
    ).toBe(409);
    const next = await request(`jobs/${id}`);
    expect(await next.json()).toMatchObject({ status: 'queued', attempt: 2 });
  });
  it('preserves a started cancellation charge and refuses a late completion', async () => {
    const { id } = await (await job(await project())).json();
    await internal('claim', { jobId: id, attempt: 1 });
    await internal('progress', { jobId: id, attempt: 1, status: 'rendering', progress: 10 });
    await request(`jobs/${id}/cancel`, {});
    expect(
      await (await internal('finish', { jobId: id, attempt: 1, success: true })).json(),
    ).toEqual({ cancel: true });
    expect(
      sqlite.prepare('SELECT status,charged FROM studio_jobs WHERE id=?').get(id),
    ).toMatchObject({ status: 'cancelled', charged: 1 });
    expect((await internal('finish', { jobId: id, attempt: 1, success: true })).status).toBe(409);
  });
  it('does not serve expired uploads even with a still-valid signed URL', async () => {
    sqlite
      .prepare(
        "INSERT INTO studio_assets(id,owner,registered,object_key,size,mime,status,created_at,expires_at) VALUES('asset','guest:1',0,'uploads/asset',100,'image/png','ready',1,2)",
      )
      .run();
    const token = await capability(env.STUDIO_SIGNING_SECRET, 'asset:asset', Date.now() + 60000);
    expect((await request(`file/asset?token=${token}`)).status).toBe(404);
    expect(env.VIDEO_STUDIO_PRIVATE.get).not.toHaveBeenCalled();
  });
  it('fails closed for absent Turnstile and paused generation', async () => {
    const id = await project();
    const noToken = await request('jobs', {
      projectId: id,
      idempotency: crypto.randomUUID(),
      hash: await manifestHash(fixture),
    });
    expect(noToken.status).toBe(403);
    env.STUDIO_ENABLED = '0';
    expect((await job(id)).status).toBe(503);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM studio_jobs').get().n).toBe(0);
  });
});
