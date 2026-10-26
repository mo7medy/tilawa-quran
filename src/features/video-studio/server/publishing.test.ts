// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention -- Test real SQL column names and GraphQL payloads. */
/* eslint-disable react-func/max-lines-per-function -- Exercise complete persistence and provider lifecycles. */
/* eslint-disable max-lines -- Real SQLite integration fixture covers authorization, retries and public media access. */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultSpec, StudioOwner } from '../contracts';

import { bufferChannels, createBufferPost } from './bufferClient';
import { fileRequest } from './files';
import { decryptPublisherToken, encryptPublisherToken, publisherToken } from './publisherCrypto';
import { publishingRequest } from './publishingApi';
import { enqueuePublications } from './publishingQueue';
import { maintainPublishing } from './publishingRunner';
import { publisher, publishingState } from './publishingStore';
import { StudioEnv } from './runtime';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let db: InstanceType<typeof DatabaseSync>;
let env: StudioEnv;
const owner: StudioOwner = {
  id: 'user:owner',
  registered: true,
  canAutomate: true,
  network: 'test',
};
const token = 'test-provider-token-not-a-real-key';
const channel = {
  id: 'channel1',
  organizationId: 'org1',
  name: 'My TikTok',
  service: 'tiktok',
  allowedActions: ['scheduleUpdates'],
  isDisconnected: false,
  isLocked: false,
  isQueuePaused: false,
  metadata: { defaultToReminders: false },
};
const provider = vi.fn();
const request = (method: string): Request =>
  new Request('https://studio.example/api/video-studio/publishing', { method });
const sql = (query: string, ...args: unknown[]): Record<string, unknown> =>
  db.prepare(query).get(...args);
const post = (status = 'sending') => ({
  id: 'post1',
  channelId: channel.id,
  status,
  externalLink: null,
});
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T09:00:00Z'));
  db = new DatabaseSync(':memory:');
  readdirSync('services/video-renderer/migrations')
    .sort()
    .forEach((file) => db.exec(readFileSync(`services/video-renderer/migrations/${file}`, 'utf8')));
  const statement = (query: string, values: unknown[] = []): unknown => ({
    bind: (...args: unknown[]) => statement(query, args),
    first: async () => db.prepare(query).get(...values) ?? null,
    all: async () => ({ results: db.prepare(query).all(...values) }),
    run: () => ({ meta: { changes: Number(db.prepare(query).run(...values).changes) } }),
  });
  env = {
    VIDEO_STUDIO_DB: {
      prepare: statement,
      batch: async (items: { run: () => unknown }[]) => {
        db.exec('BEGIN');
        try {
          const results = items.map((s) => s.run());
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
    VIDEO_STUDIO_PRIVATE: {
      head: vi.fn(async () => ({ size: 8 })),
      get: vi.fn(async () => ({ body: new Uint8Array([0, 1]) })),
    },
    STUDIO_ENABLED: '1',
    STUDIO_SIGNING_SECRET: 'local-test-master-secret',
    STUDIO_AUTOMATION_EMAIL_HASH: 'configured',
    STUDIO_ORIGIN: 'https://studio.example',
  } as unknown as StudioEnv;
  db.prepare(
    'INSERT INTO studio_automation_settings(id,owner,enabled,updated_at,activated_at) VALUES(1,?,1,?,?)',
  ).run(owner.id, Date.now(), Date.now());
  provider.mockReset();
  provider.mockImplementation(async (_url: string, init: RequestInit) => {
    const { query } = JSON.parse(String(init.body));
    if (query.includes('account {')) {
      return Response.json({ data: { account: { organizations: [{ id: 'org1' }] } } });
    }
    if (query.includes('channels(')) return Response.json({ data: { channels: [channel] } });
    if (query.includes('createPost(')) {
      return Response.json({
        data: { createPost: { __typename: 'PostActionSuccess', post: post() } },
      });
    }
    return Response.json({ data: { post: post('sent') } });
  });
  vi.stubGlobal('fetch', provider);
  await publishingRequest(env, request('POST'), owner, 'connect', { token, channelId: channel.id });
  await publishingRequest(env, request('PUT'), owner, undefined, { enabled: true });
  provider.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  db.close();
});
const completedRun = (id = 'run1', created = Date.now() + 1): void => {
  const job = `job-${id}`;
  db.prepare(
    "INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,storage_limit,output_reserved,manifest,status,idempotency,output_key,created_at,expires_at) VALUES(?,?,?,1,'2026-10-26',10,45000,1073741824,1000,'{}','completed',?,'private.mp4',?,?)",
  ).run(job, owner.id, 'project1', id, created, Date.now() + 7 * 86400000);
  db.prepare(
    "INSERT INTO studio_automation_runs(id,owner,day,slot,status,plan,job_id,created_at,updated_at) VALUES(?,?,'2026-10-26',?,'completed',?,?,?,?)",
  ).run(
    id,
    owner.id,
    id === 'run1' ? 0 : 1,
    JSON.stringify({ spec: defaultSpec, caption: 'تلاوة', hashtags: ['#قرآن'] }),
    job,
    created,
    created,
  );
};
const writes = (): number =>
  provider.mock.calls.filter(([, init]) => String(init.body).includes('createPost(')).length;

describe('publisher credentials and account boundary', () => {
  it('supports a Worker secret without persisting its value in D1', async () => {
    env.STUDIO_BUFFER_TOKEN = token;
    db.prepare("UPDATE studio_publisher SET token='worker-secret:v1'").run();
    expect(await publisherToken(env, owner.id, (await publisher(env)).token)).toBe(token);
    expect(JSON.stringify(await publishingState(env, owner))).not.toContain(token);
    delete env.STUDIO_BUFFER_TOKEN;
    await expect(publisherToken(env, owner.id, 'worker-secret:v1')).rejects.toThrow(
      'BUFFER_RECONNECT',
    );
  });
  it('encrypts with random nonces and rejects another owner, secret or tampering', async () => {
    const encrypted = await encryptPublisherToken('secret', owner.id, token);
    expect(encrypted).not.toContain(token);
    expect(await encryptPublisherToken('secret', owner.id, token)).not.toBe(encrypted);
    expect(await decryptPublisherToken('secret', owner.id, encrypted)).toBe(token);
    await expect(decryptPublisherToken('secret', 'other', encrypted)).rejects.toThrow(
      'BUFFER_RECONNECT',
    );
    await expect(decryptPublisherToken('changed', owner.id, encrypted)).rejects.toThrow(
      'BUFFER_RECONNECT',
    );
    await expect(decryptPublisherToken('secret', owner.id, `${encrypted}x`)).rejects.toThrow(
      'BUFFER_RECONNECT',
    );
  });
  it('never returns the token and refuses guests or a different account', async () => {
    expect(JSON.stringify(await publishingState(env, owner))).not.toContain(token);
    expect(JSON.stringify(await publishingState(env, owner))).not.toContain('token');
    expect(sql('SELECT token FROM studio_publisher').token).not.toBe(token);
    await expect(
      publishingRequest(env, request('GET'), { ...owner, canAutomate: false }, undefined, {}),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      publishingRequest(env, request('PUT'), { ...owner, id: 'user:other' }, undefined, {
        enabled: true,
      }),
    ).rejects.toThrow('FORBIDDEN');
    expect(provider).not.toHaveBeenCalled();
  });
  it('lists reminder-only accounts as ineligible and rejects saving them', async () => {
    provider
      .mockResolvedValueOnce(
        Response.json({ data: { account: { organizations: [{ id: 'org1' }] } } }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { channels: [{ ...channel, metadata: { defaultToReminders: true } }] },
        }),
      );
    expect((await bufferChannels(token))[0].eligible).toBe(false);
  });
  it('uses a fixed destination and disallows credential-bearing redirects', async () => {
    await bufferChannels(token);
    provider.mock.calls.forEach(([url, init]) => {
      expect(url).toBe('https://api.buffer.com');
      expect(init.redirect).toBe('manual');
    });
  });
});

describe('durable publishing queue', () => {
  it('sends once under racing cron invocations and confirms publication only after sent', async () => {
    completedRun();
    await Promise.all([maintainPublishing(env), maintainPublishing(env)]);
    expect(writes()).toBe(1);
    expect(sql('SELECT status,post_id FROM studio_publications')).toMatchObject({
      status: 'pending',
      post_id: 'post1',
    });
    await maintainPublishing(env);
    expect(writes()).toBe(1);
    vi.setSystemTime(Date.now() + 600001);
    await maintainPublishing(env);
    expect(sql('SELECT status FROM studio_publications').status).toBe('published');
    expect(writes()).toBe(1);
  });
  it('excludes videos reserved before activation and skips expired sources', async () => {
    completedRun('run1', Date.now() - 1000);
    completedRun('run2');
    db.prepare('UPDATE studio_jobs SET expires_at=? WHERE id=?').run(Date.now(), 'job-run2');
    await maintainPublishing(env);
    expect(sql('SELECT COUNT(*) count FROM studio_publications').count).toBe(0);
    expect(writes()).toBe(0);
  });
  it('does not resend after a provider timeout or an expired sending lease', async () => {
    completedRun();
    provider.mockImplementation(async (_url, init) => {
      const document = String(init.body);
      if (document.includes('createPost(')) throw new Error('private-provider-response');
      if (document.includes('account {')) {
        return Response.json({ data: { account: { organizations: [{ id: 'org1' }] } } });
      }
      return Response.json({ data: { channels: [channel] } });
    });
    await maintainPublishing(env);
    expect(sql('SELECT status,error FROM studio_publications')).toMatchObject({
      status: 'unknown',
      error: 'BUFFER_UNCERTAIN',
    });
    db.prepare("UPDATE studio_publications SET status='sending',lease_until=0").run();
    await maintainPublishing(env);
    expect(sql('SELECT status FROM studio_publications').status).toBe('unknown');
    expect(writes()).toBe(1);
  });
  it('waits on explicit 429 responses and safely retries only that rejected request', async () => {
    completedRun();
    const normal = provider.getMockImplementation();
    let limited = true;
    provider.mockImplementation(async (url, init) => {
      if (String(init.body).includes('createPost(') && limited) {
        limited = false;
        return new Response(null, { status: 429, headers: { 'retry-after': '60' } });
      }
      return normal(url, init);
    });
    await maintainPublishing(env);
    expect(sql('SELECT status FROM studio_publications').status).toBe('queued');
    await maintainPublishing(env);
    expect(writes()).toBe(1);
    vi.setSystemTime(Date.now() + 60001);
    await maintainPublishing(env);
    expect(writes()).toBe(2);
    expect(sql('SELECT status FROM studio_publications').status).toBe('pending');
  });
  it('pause cancels unsent items and never re-enqueues them on resume', async () => {
    completedRun();
    await enqueuePublications(env, await publisher(env));
    await publishingRequest(env, request('PUT'), owner, undefined, { enabled: false });
    await maintainPublishing(env);
    expect(writes()).toBe(0);
    expect(sql('SELECT status FROM studio_publications').status).toBe('cancelled');
    await publishingRequest(env, request('PUT'), owner, undefined, { enabled: true });
    await maintainPublishing(env);
    expect(writes()).toBe(0);
  });
  it('a pause during channel validation prevents the external write', async () => {
    completedRun();
    const normal = provider.getMockImplementation();
    provider.mockImplementation(async (url, init) => {
      if (String(init.body).includes('channels(')) {
        await publishingRequest(env, request('PUT'), owner, undefined, { enabled: false });
      }
      return normal(url, init);
    });
    await maintainPublishing(env);
    expect(writes()).toBe(0);
    expect(sql('SELECT status FROM studio_publications').status).toBe('failed');
  });
  it('stops polling after one day without resending the post', async () => {
    completedRun();
    await maintainPublishing(env);
    vi.setSystemTime(Date.now() + 86400001);
    await maintainPublishing(env);
    expect(sql('SELECT status FROM studio_publications').status).toBe('unknown');
    expect(writes()).toBe(1);
  });
  it('does not report a draft awaiting approval as published', async () => {
    completedRun();
    const normal = provider.getMockImplementation();
    provider.mockImplementation(async (url, init) =>
      String(init.body).includes('createPost(')
        ? Response.json({
            data: { createPost: { __typename: 'PostActionSuccess', post: post('needs_approval') } },
          })
        : normal(url, init),
    );
    await maintainPublishing(env);
    expect(sql('SELECT status FROM studio_publications').status).toBe('review');
  });
  it('uses shareNow, automatic scheduling and a stable selected-video-only URL', async () => {
    completedRun();
    await maintainPublishing(env);
    const [, init] = provider.mock.calls.find(([, value]) =>
      String(value.body).includes('createPost('),
    );
    const { input } = JSON.parse(String(init.body)).variables;
    expect(input).toMatchObject({
      mode: 'shareNow',
      schedulingType: 'automatic',
      channelId: channel.id,
      aiAssisted: true,
    });
    expect(input.assets[0].video.url).toMatch(
      /^https:\/\/studio.example\/api\/video-studio\/publication-media\/[a-f0-9-]{36}\.mp4$/,
    );
    expect(input.assets[0].video.url).not.toContain('private.mp4');
    expect(input.assets[0].video.url).not.toContain('token=');
  });
  it('does not retry a typed mutation rejection', async () => {
    provider.mockResolvedValue(
      Response.json({ data: { createPost: { __typename: 'MutationError' } } }),
    );
    await expect(
      createBufferPost(token, channel.id, 'caption', 'https://studio.example/file.mp4'),
    ).rejects.toThrow('BUFFER_REJECTED');
  });
});

describe('publication media access', () => {
  it('serves HEAD and ranges only for the authorized output and rejects expiry or wrong owner', async () => {
    completedRun();
    await maintainPublishing(env);
    const row = sql('SELECT id FROM studio_publications');
    const path = `${row.id}.mp4`;
    const head = await fileRequest(
      env,
      new Request('https://studio.example', { method: 'HEAD' }),
      'publication-media',
      path,
    );
    expect(head.headers.get('content-type')).toBe('video/mp4');
    expect(head.headers.get('content-length')).toBe('8');
    const range = await fileRequest(
      env,
      new Request('https://studio.example', { headers: { Range: 'bytes=0-1' } }),
      'publication-media',
      path,
    );
    expect(range.status).toBe(206);
    expect(range.headers.get('content-length')).toBe('2');
    await expect(
      fileRequest(env, new Request('https://studio.example'), 'publication-media', 'private.mp4'),
    ).rejects.toThrow('NOT_FOUND');
    db.prepare("UPDATE studio_jobs SET owner='user:other'").run();
    await expect(
      fileRequest(env, new Request('https://studio.example'), 'publication-media', path),
    ).rejects.toThrow('NOT_FOUND');
    db.prepare('UPDATE studio_jobs SET owner=?').run(owner.id);
    db.prepare('UPDATE studio_publications SET media_until=?').run(Date.now());
    await expect(
      fileRequest(env, new Request('https://studio.example'), 'publication-media', path),
    ).rejects.toThrow('NOT_FOUND');
  });
});
