/* eslint-disable no-restricted-syntax -- Native test-only loops inspect real SQLite rows. */
// @vitest-environment node
/* eslint-disable @typescript-eslint/naming-convention, react-func/max-lines-per-function, max-lines -- Real SQLite fixtures exercise the durable scheduling and provider boundaries. */
/* eslint-disable no-await-in-loop -- Quota boundaries require sequential operations. */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { automationClock } from '../automation';
import { defaultSpec, StudioOwner, StudioCatalog, ResolvedVideoManifest } from '../contracts';

import { automationRequest } from './automationApi';
import { chooseAutomationPlan } from './automationModel';
import { createJob, manifestHash } from './jobs';
import { quota } from './jobTransport';
import { adminRequest } from './multiAdmin';
import { adminState } from './multiAdminState';
import { tomorrowCairo } from './multiControl';
import { migrateMultiPublishing } from './multiMigration';
import { maintainMultiPublishing } from './multiPublishingRunner';
import { claimDelivery, enqueueDeliveries } from './multiQueue';
import { cairoSlotAt, planMultiDay } from './multiSchedule';
import { encryptPublisherToken } from './publisherCrypto';
import { publishingRequest } from './publishingApi';
import { StudioEnv } from './runtime';

const resolved = vi.hoisted(() => vi.fn());
vi.mock('./content', () => ({ resolveManifest: resolved }));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let db: InstanceType<typeof DatabaseSync>;
let env: StudioEnv;
const owner = 'user:automation-owner';
const actor: StudioOwner = {
  id: 'user:admin',
  registered: true,
  network: 'test',
  adminVerified: true,
};
const provider = vi.fn();
const sql = (query: string, ...args: unknown[]): Record<string, unknown> =>
  db.prepare(query).get(...args);
const request = (method: string): Request =>
  new Request('https://studio.example/api/video-studio/admin', { method });
const api = (
  path: string[],
  body: Record<string, unknown> = {},
  method = 'POST',
  identity = actor,
): Promise<Response> => adminRequest(env, request(method), identity, path, body);
const channel = (index: number, account = 0) => ({
  id: `channel-${account}-${index}`,
  name: `Account ${account}-${index}`,
  organizationId: `org-${account}`,
  service: index === 2 ? 'instagram' : 'tiktok',
  allowedActions: ['scheduleUpdates'],
  isDisconnected: false,
  isLocked: false,
  isQueuePaused: false,
  metadata: { defaultToReminders: false },
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T03:00:00Z'));
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
          const results = items.map((i) => i.run());
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
    VIDEO_STUDIO_PRIVATE: { head: vi.fn(async () => ({ size: 8 })) },
    STUDIO_ENABLED: '1',
    STUDIO_SIGNING_SECRET: 'test-only-encryption-master',
    STUDIO_AUTOMATION_EMAIL_HASH: 'configured',
    STUDIO_ORIGIN: 'https://studio.example',
  } as unknown as StudioEnv;
  db.prepare(
    'INSERT INTO studio_automation_settings(id,owner,enabled,updated_at,activated_at) VALUES(1,?,1,?,?)',
  ).run(owner, Date.now(), Date.now());
  db.exec(
    "UPDATE studio_multi_control SET active=1,mode='independent',next_mode='independent',cutover_day='2026-10-28'",
  );
  provider.mockReset();
  provider.mockImplementation(async (_url: string, init: RequestInit) => {
    const account = Number(
      String((init.headers as Record<string, string>).Authorization).slice(-1),
    );
    const { query, variables } = JSON.parse(String(init.body));
    if (query.includes('account {')) {
      return Response.json({
        data: {
          account: {
            id: `buffer-${account}`,
            name: `Buffer ${account}`,
            organizations: [{ id: `org-${account}` }],
          },
        },
      });
    }
    if (query.includes('channels(')) {
      return Response.json({
        data: { channels: [channel(0, account), channel(1, account), channel(2, account)] },
      });
    }
    const post = {
      id: crypto.randomUUID(),
      channelId: variables?.input?.channelId ?? 'channel-0-0',
      status: 'sent',
      externalLink: 'https://www.tiktok.com/@test/video/123',
    };
    return Response.json({ data: { createPost: { __typename: 'PostActionSuccess', post } } });
  });
  vi.stubGlobal('fetch', provider);
});
afterEach(() => {
  db.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const connection = async (index = 0): Promise<string> => {
  const response = await api(['connections'], {
    name: `Buffer ${index}`,
    token: `test-only-provider-key-${index}`,
  });
  return (await response.json()).id;
};
const destination = async (
  connectionId: string,
  index = 0,
  account = 0,
  count = 3,
): Promise<string> => {
  const response = await api(['destinations'], {
    connectionId,
    channelId: channel(index, account).id,
  });
  const { id } = await response.json();
  await api(['destinations', id], { dailyCount: count }, 'PUT');
  return id;
};
const tomorrow = (): void => vi.setSystemTime(new Date('2026-10-30T07:00:00Z'));
const complete = (taskId: string): string => {
  const jobId = crypto.randomUUID();
  const { day } = automationClock(Date.now());
  const plan = {
    spec: defaultSpec,
    caption: 'Quran recitation',
    hashtags: ['#Quran'],
    candidateId: '1:1-7:7',
    durationMs: 45000,
  };
  db.prepare(
    "INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved,status,output_key,output_size,quota_class) VALUES(?,?,?,1,?,30,45000,'{}',?,?,?,10737418240,1000,'completed','output.mp4',8,'automation')",
  ).run(jobId, owner, taskId, day, taskId, Date.now(), Date.now() + 7 * 86400000);
  db.prepare(
    "UPDATE studio_automation_tasks SET status='completed',plan=?,job_id=? WHERE id=?",
  ).run(JSON.stringify(plan), jobId, taskId);
  return jobId;
};

describe('multi-account automation and publishing', () => {
  it('requires verified administrator access, independently of the automation owner', async () => {
    await expect(api([], {}, 'GET', { ...actor, adminVerified: false })).rejects.toMatchObject({
      code: 'ADMIN_REQUIRED',
    });
    await expect(
      api([], {}, 'GET', { ...actor, id: owner, adminVerified: false }),
    ).rejects.toMatchObject({ code: 'ADMIN_REQUIRED' });
    const response = await api([], {}, 'GET');
    expect(response.status).toBe(200);
  });
  it('connects three Buffer identities and nine channels, rejects duplicate identities and keeps keys encrypted', async () => {
    for (let i = 0; i < 3; i += 1) {
      const c = await connection(i);
      for (let n = 0; n < 3; n += 1) await destination(c, n, i);
    }
    await expect(connection(0)).rejects.toMatchObject({ code: 'BUFFER_DUPLICATE' });
    await expect(connection(3)).rejects.toThrow('CONNECTION_LIMIT');
    const state = await adminState(env, owner);
    expect(state.connections).toHaveLength(3);
    expect(state.destinations).toHaveLength(9);
    expect(JSON.stringify(state)).not.toContain('test-only-provider-key');
    expect(sql('SELECT token FROM studio_buffer_connections').token).toMatch(/^1\./);
    expect(state.audit).toHaveLength(21);
  });
  it('does not attach a new connection implicitly to a channel and rejects duplicate channels', async () => {
    const c = await connection();
    expect(sql('SELECT COUNT(*) AS n FROM studio_destinations').n).toBe(0);
    const d = await destination(c, 0, 0, 0);
    expect(sql('SELECT paused,next_count FROM studio_destinations WHERE id=?', d)).toEqual({
      paused: 1,
      next_count: 0,
    });
    await expect(destination(c)).rejects.toMatchObject({ code: 'BUFFER_CHANNEL_DUPLICATE' });
  });
  it('rotates only keys for the same account and preserves destination and delivery identity', async () => {
    const c = await connection();
    const d = await destination(c);
    await expect(
      api(['connections', c], { token: 'test-only-provider-key-1' }, 'PUT'),
    ).rejects.toMatchObject({ code: 'BUFFER_IDENTITY_MISMATCH' });
    await api(['connections', c], { token: 'another-valid-provider-key-0' }, 'PUT');
    expect(sql('SELECT connection_id FROM studio_destinations WHERE id=?', d).connection_id).toBe(
      c,
    );
    expect(sql('SELECT COUNT(*) AS n FROM studio_buffer_connections').n).toBe(1);
  });
  it('builds exactly 27 distinct tasks, atomically and without backfill for newly activated accounts', async () => {
    for (let i = 0; i < 3; i += 1) {
      const c = await connection(i);
      for (let n = 0; n < 3; n += 1) await destination(c, n, i);
    }
    await planMultiDay(env, owner);
    expect(sql('SELECT COUNT(*) AS n FROM studio_automation_tasks').n).toBe(0);
    tomorrow();
    await Promise.all([planMultiDay(env, owner), planMultiDay(env, owner)]);
    expect(sql('SELECT COUNT(*) AS n FROM studio_automation_tasks').n).toBe(27);
    expect(sql('SELECT COUNT(*) AS n FROM studio_task_destinations').n).toBe(27);
    expect(sql("SELECT COUNT(*) AS n FROM studio_automation_tasks WHERE status='skipped'").n).toBe(
      0,
    );
  });
  it('shares just three renders with the correct per-slot destination counts', async () => {
    const c = await connection();
    await destination(c, 0, 0, 1);
    await destination(c, 1, 0, 2);
    await destination(c, 2, 0, 3);
    await api(['policy'], { mode: 'shared' }, 'PUT');
    tomorrow();
    await planMultiDay(env, owner);
    expect(sql('SELECT COUNT(*) AS n FROM studio_automation_tasks').n).toBe(3);
    expect(
      db
        .prepare(
          'SELECT slot,COUNT(*) AS n FROM studio_automation_tasks t JOIN studio_task_destinations td ON td.task_id=t.id GROUP BY slot ORDER BY slot',
        )
        .all(),
    ).toEqual([
      { slot: 0, n: 3 },
      { slot: 1, n: 2 },
      { slot: 2, n: 1 },
    ]);
    for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) {
      complete(task.id);
    }
    await Promise.all([enqueueDeliveries(env), enqueueDeliveries(env)]);
    expect(sql('SELECT COUNT(*) AS n FROM studio_deliveries').n).toBe(6);
    expect(sql('SELECT COUNT(DISTINCT job_id) AS n FROM studio_deliveries').n).toBe(3);
  });
  it('applies nonzero edits and mode changes tomorrow, and zero cancels only that destination now', async () => {
    const c = await connection();
    const a = await destination(c, 0);
    const b = await destination(c, 1);
    tomorrow();
    await planMultiDay(env, owner);
    await api(['destinations', a], { dailyCount: 1 }, 'PUT');
    await api(['policy'], { mode: 'shared' }, 'PUT');
    await planMultiDay(env, owner);
    expect(sql('SELECT daily_count,next_count FROM studio_destinations WHERE id=?', a)).toEqual({
      daily_count: 3,
      next_count: 1,
    });
    expect(sql('SELECT mode FROM studio_automation_days').mode).toBe('independent');
    await api(['destinations', a], { dailyCount: 0 }, 'PUT');
    expect(
      sql(
        "SELECT COUNT(*) AS n FROM studio_automation_tasks t JOIN studio_task_destinations td ON td.task_id=t.id WHERE td.destination_id=? AND t.status='skipped'",
        a,
      ).n,
    ).toBe(3);
    expect(
      sql(
        "SELECT COUNT(*) AS n FROM studio_automation_tasks t JOIN studio_task_destinations td ON td.task_id=t.id WHERE td.destination_id=? AND t.status='queued'",
        b,
      ).n,
    ).toBe(3);
    await api(['destinations', a], { dailyCount: 1 }, 'PUT');
    await planMultiDay(env, owner);
    expect(sql('SELECT paused FROM studio_destinations WHERE id=?', a).paused).toBe(1);
  });
  it('does not regenerate a shared task when one of its destinations is stopped', async () => {
    const c = await connection();
    const a = await destination(c, 0);
    await destination(c, 1);
    await api(['policy'], { mode: 'shared' }, 'PUT');
    tomorrow();
    await planMultiDay(env, owner);
    await api(['destinations', a], { dailyCount: 0 }, 'PUT');
    expect(sql("SELECT COUNT(*) AS n FROM studio_automation_tasks WHERE status='queued'").n).toBe(
      3,
    );
  });
  it('publishes to separate destinations and never retries an ambiguous write', async () => {
    const c = await connection();
    await destination(c, 0, 0, 1);
    await destination(c, 1, 0, 1);
    tomorrow();
    await planMultiDay(env, owner);
    for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) {
      complete(task.id);
    }
    const normal = provider.getMockImplementation();
    let writes = 0;
    provider.mockImplementation(async (url, init) => {
      if (JSON.parse(String(init.body)).query.includes('createPost')) {
        writes += 1;
        if (writes === 1) throw new Error('lost response');
      }
      return normal(url, init);
    });
    await maintainMultiPublishing(env);
    await maintainMultiPublishing(env);
    await maintainMultiPublishing(env);
    expect(writes).toBe(2);
    expect(sql("SELECT COUNT(*) AS n FROM studio_deliveries WHERE status='unknown'").n).toBe(1);
    expect(sql("SELECT COUNT(*) AS n FROM studio_deliveries WHERE status='published'").n).toBe(1);
  });
  it('backs off one Buffer connection after 429 while the other connection can publish', async () => {
    const a = await connection();
    const b = await connection(1);
    await destination(a, 0, 0, 1);
    await destination(b, 0, 1, 1);
    tomorrow();
    await planMultiDay(env, owner);
    for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) {
      complete(task.id);
    }
    const normal = provider.getMockImplementation();
    provider.mockImplementation(async (url, init) =>
      JSON.parse(String(init.body)).query.includes('createPost') &&
      String(init.headers.Authorization).endsWith('0')
        ? new Response('', { status: 429, headers: { 'retry-after': '600' } })
        : normal(url, init),
    );
    await maintainMultiPublishing(env);
    await maintainMultiPublishing(env);
    expect(sql("SELECT COUNT(*) AS n FROM studio_deliveries WHERE status='published'").n).toBe(1);
    expect(
      Number(
        sql('SELECT cooldown_until FROM studio_buffer_connections WHERE id=?', a).cooldown_until,
      ),
    ).toBeGreaterThan(Date.now());
  });
  it('keeps at least five hours between sends per account and closes unsent work at the day boundary', async () => {
    const c = await connection();
    const d = await destination(c);
    tomorrow();
    await planMultiDay(env, owner);
    for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) {
      complete(task.id);
    }
    await maintainMultiPublishing(env);
    await maintainMultiPublishing(env);
    expect(sql("SELECT COUNT(*) AS n FROM studio_deliveries WHERE status='published'").n).toBe(1);
    vi.setSystemTime(Date.now() + 5 * 3600000);
    await maintainMultiPublishing(env);
    expect(sql("SELECT COUNT(*) AS n FROM studio_deliveries WHERE status='published'").n).toBe(2);
    vi.setSystemTime(Date.now() + 24 * 3600000);
    await maintainMultiPublishing(env);
    expect(
      sql(
        "SELECT COUNT(*) AS n FROM studio_deliveries WHERE destination_id=? AND status='cancelled'",
        d,
      ).n,
    ).toBe(1);
  });
  it('separates manual quota and storage from automation records', async () => {
    const c = await connection();
    await destination(c);
    tomorrow();
    await planMultiDay(env, owner);
    for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) {
      complete(task.id);
    }
    const manual = await quota(env, { ...actor, id: owner });
    expect(manual.remaining).toBe(10);
    expect(manual.storageBytes).toBe(0);
    const state = await adminState(env, owner);
    expect(state.usage.renders).toBe(3);
    expect(state.usage.storageBytes).toBe(24);
  });
  it('rejects obsolete platform-only writes and preserves an emergency owner stop', async () => {
    const identity = { ...actor, id: owner, canAutomate: true };
    await expect(
      publishingRequest(env, request('PUT'), identity, undefined, { enabled: true }),
    ).rejects.toMatchObject({ code: 'PUBLISHING_REFRESH_REQUIRED' });
    await expect(
      automationRequest(env, request('POST'), identity, 'run', {}),
    ).rejects.toMatchObject({ code: 'PUBLISHING_REFRESH_REQUIRED' });
    await automationRequest(env, request('PUT'), identity, undefined, {
      enabled: false,
      optionalThird: true,
    });
    expect(sql('SELECT enabled FROM studio_automation_settings').enabled).toBe(0);
  });
  it('uses IANA Cairo time across summer time and the October transition', () => {
    expect(automationClock(cairoSlotAt('2026-07-01', 0))).toEqual({ day: '2026-07-01', hour: 9 });
    expect(new Date(cairoSlotAt('2026-07-01', 0)).toISOString()).toBe('2026-07-01T06:00:00.000Z');
    expect(new Date(cairoSlotAt('2026-11-01', 0)).toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(tomorrowCairo(Date.parse('2026-10-29T22:30:00Z'))).toBe('2026-10-31');
  });
  it('keeps accepted publication IDs, statuses and media URLs through the production cutover', async () => {
    db.exec("UPDATE studio_multi_control SET active=0,maintenance=1,cutover_day='' ");
    const stored = await encryptPublisherToken(
      env.STUDIO_SIGNING_SECRET,
      owner,
      'test-only-provider-key-0',
    );
    db.prepare(
      "INSERT INTO studio_publisher(id,platform,owner,token,revision,organization_id,channel_id,channel_name,enabled,activated_at,updated_at) VALUES(1,'tiktok',?,?,'old-key','org-0','channel-0-0','My TikTok',1,?,?)",
    ).run(owner, stored, Date.now() - 86400000, Date.now());
    const run = crypto.randomUUID();
    const oldPlan = JSON.stringify({
      spec: defaultSpec,
      caption: 'old',
      hashtags: [],
      durationMs: 45000,
      candidateId: '1:1-7:7',
    });
    db.prepare(
      "INSERT INTO studio_automation_runs(id,owner,day,slot,status,plan,job_id,created_at,updated_at) VALUES(?,?,'2026-10-29',0,'completed',?,'old-job',?,?)",
    ).run(run, owner, oldPlan, Date.now() - 1000, Date.now());
    db.prepare(
      "INSERT INTO studio_publications(id,run_id,owner,job_id,connection_revision,channel_id,organization_id,text,status,post_id,external_url,media_until,created_at,updated_at) VALUES('preserved-publication',?,?,'old-job','old-key','channel-0-0','org-0','old','published','buffer-post','https://www.tiktok.com/@test/video/123',?,?,?)",
    ).run(run, owner, Date.now() + 86400000, Date.now() - 500, Date.now());
    db.prepare(
      "INSERT INTO studio_publications(id,run_id,owner,platform,job_id,connection_revision,channel_id,organization_id,text,status,post_id,media_until,created_at,updated_at) VALUES('pending-publication','older-run',?,'tiktok','old-job','old-key','channel-0-0','org-0','old','pending','accepted-post',?,?,?)",
    ).run(owner, Date.now() + 86400000, Date.now(), Date.now());
    await migrateMultiPublishing(env);
    await migrateMultiPublishing(env);
    expect(sql('SELECT active,maintenance,next_mode FROM studio_multi_control')).toEqual({
      active: 1,
      maintenance: 0,
      next_mode: 'independent',
    });
    expect(
      sql(
        "SELECT id,status,post_id,external_url FROM studio_deliveries WHERE id='preserved-publication'",
      ),
    ).toEqual({
      id: 'preserved-publication',
      status: 'published',
      post_id: 'buffer-post',
      external_url: 'https://www.tiktok.com/@test/video/123',
    });
    expect(sql('SELECT COUNT(*) AS n FROM studio_publications').n).toBe(2);
    expect(
      sql("SELECT status,post_id FROM studio_deliveries WHERE id='pending-publication'"),
    ).toEqual({ status: 'pending', post_id: 'accepted-post' });
    expect(sql("SELECT COUNT(*) AS n FROM studio_automation_tasks WHERE day='2026-10-29'").n).toBe(
      3,
    );
    expect(sql('SELECT COUNT(*) AS n FROM studio_buffer_connections').n).toBe(1);
    expect((await claimDelivery(env))?.id).toBe('pending-publication');
  });
});

describe('automation render reservations and model budget', () => {
  it('reserves a render from the administrative quota and refuses a paused destination atomically', async () => {
    const c = await connection();
    const d = await destination(c);
    tomorrow();
    await planMultiDay(env, owner);
    const task = sql('SELECT id FROM studio_automation_tasks ORDER BY slot LIMIT 1');
    db.prepare(
      "UPDATE studio_automation_tasks SET status='ready',lease='render-lease' WHERE id=?",
    ).run(task.id);
    db.prepare(
      'INSERT INTO studio_projects(id,owner,registered,spec,updated_at,expires_at) VALUES(?,?,1,?,?,?)',
    ).run(task.id, owner, JSON.stringify(defaultSpec), Date.now(), Date.now() + 30 * 86400000);
    const manifest = {
      version: '1',
      renderVersion: 'studio-2',
      spec: defaultSpec,
      verses: [],
      fonts: [],
      audio: { url: 'https://audio.example.test/audio.mp3', startMs: 0, endMs: 45000 },
      background: { type: 'color', url: '' },
      durationMs: 45000,
      width: 1080,
      height: 1920,
      fps: 30,
    } as ResolvedVideoManifest;
    resolved.mockResolvedValue(manifest);
    const identity = { ...actor, id: owner };
    const job = await createJob(
      env,
      identity,
      String(task.id),
      String(task.id),
      await manifestHash(manifest),
      { id: String(task.id), lease: 'render-lease', multi: true },
    );
    expect(
      sql('SELECT daily_limit,storage_limit,quota_class FROM studio_jobs WHERE id=?', job.id),
    ).toEqual({ daily_limit: 30, storage_limit: 10737418240, quota_class: 'automation' });
    expect(sql('SELECT status,job_id FROM studio_automation_tasks WHERE id=?', task.id)).toEqual({
      status: 'submitted',
      job_id: job.id,
    });
    await api(['destinations', d], { dailyCount: 0 }, 'PUT');
    expect(sql('SELECT COUNT(*) AS n FROM studio_jobs').n).toBe(1);
  });
  it('caps model calls at sixty per UTC day with no provider fallback', async () => {
    const candidate = {
      id: '3:1-3:7',
      chapterId: 3,
      from: 1,
      to: 3,
      reciterId: 7,
      reciter: 'Reader',
      chapter: 'Ali Imran',
      durationMs: 30000,
    };
    const catalog: StudioCatalog = {
      enabled: true,
      chapters: [],
      reciters: [],
      translations: [{ id: 20, name: 'Translation', language: 'english' }],
      backgrounds: [
        {
          id: 'r2-test-background',
          url: 'https://studio.example/background',
          type: 'image',
          orientation: 'portrait',
          collection: 'nature',
        },
      ],
    };
    const ai = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              candidateId: candidate.id,
              translationId: 20,
              font: defaultSpec.font,
              template: 'center',
              caption: 'Quran recitation',
              hashtags: ['#Quran'],
              skipOptional: false,
            }),
          },
          finish_reason: 'stop',
        },
      ],
    }));
    env.AI = { run: ai } as unknown as StudioEnv['AI'];
    for (let n = 0; n < 60; n += 1) {
      await chooseAutomationPlan(env, [candidate], catalog, false, undefined, true);
    }
    await expect(
      chooseAutomationPlan(env, [candidate], catalog, false, undefined, true),
    ).rejects.toMatchObject({ code: 'AUTOMATION_AI_LIMIT' });
    expect(ai).toHaveBeenCalledTimes(60);
    expect(provider).not.toHaveBeenCalled();
  });
});

it('keeps daily planning and outbox insertion under the Free-plan SQL query limit for nine accounts', async () => {
  for (let i = 0; i < 3; i += 1) {
    const c = await connection(i);
    for (let n = 0; n < 3; n += 1) await destination(c, n, i);
  }
  tomorrow();
  const queries = vi.spyOn(env.VIDEO_STUDIO_DB, 'prepare');
  await planMultiDay(env, owner);
  expect(queries.mock.calls.length).toBeLessThan(12);
  queries.mockClear();
  await planMultiDay(env, owner);
  expect(queries.mock.calls.length).toBeLessThan(4);
  for (const task of db.prepare('SELECT id FROM studio_automation_tasks').all()) complete(task.id);
  queries.mockClear();
  await enqueueDeliveries(env);
  expect(queries.mock.calls.length).toBe(1);
  expect(sql('SELECT COUNT(*) AS n FROM studio_deliveries').n).toBe(27);
});
