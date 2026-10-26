/* eslint-disable @typescript-eslint/naming-convention -- Real SQLite and provider fixtures preserve wire names. */
/* eslint-disable react-func/max-lines-per-function -- Race scenarios require the full lifecycle and SQL evidence. */
// @vitest-environment node
/* eslint-disable max-lines -- Real SQLite fixture and race scenarios verify the complete persistence boundary. */
/* eslint-disable no-await-in-loop -- Retry and budget boundaries must be exercised sequentially. */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTOMATION_MODEL, automationClock, dueAutomationSlot } from '../automation';
import { defaultSpec, ResolvedVideoManifest, StudioCatalog, StudioOwner } from '../contracts';

import { automationRequest } from './automationApi';
import { chooseAutomationPlan, validateAutomationDecision } from './automationModel';
import { maintainAutomation } from './automationRunner';
import { enqueueAutomation } from './automationSchedule';
import { configureAutomation, readAutomation, readAutomationSettings } from './automationStore';
import { StudioEnv } from './runtime';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  ai: vi.fn(),
  catalogue: vi.fn(),
  candidates: vi.fn(),
}));
vi.mock('./content', () => ({ resolveManifest: mocks.resolve }));
vi.mock('./contentSources', () => ({ catalog: mocks.catalogue }));
vi.mock('./automationCandidates', () => ({
  automationCandidates: mocks.candidates,
  cachedAutomationContent: (_env, _key, load) => load(),
}));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let db: InstanceType<typeof DatabaseSync>;
let env: StudioEnv;
const owner: StudioOwner = {
  id: 'user:automation-owner',
  registered: true,
  network: 'test',
  canAutomate: true,
};
const candidate = {
  id: '1:1-7:7',
  chapterId: 1,
  from: 1,
  to: 7,
  reciterId: 7,
  reciter: 'Reader',
  chapter: 'Al-Fatihah',
  durationMs: 45000,
};
const catalogue: StudioCatalog = {
  enabled: true,
  chapters: [{ id: 1, name: 'Al-Fatihah', count: 7 }],
  reciters: [{ id: 7, name: 'Reader' }],
  translations: [{ id: 20, name: 'Translation', language: 'english' }],
  backgrounds: [
    {
      id: 'r2-calm',
      url: 'https://studio.example/background',
      type: 'image',
      orientation: 'portrait',
      collection: 'nature',
    },
  ],
};
const decision = () => ({
  candidateId: candidate.id,
  backgroundId: 'r2-calm',
  translationId: 20,
  font: defaultSpec.font,
  template: 'center',
  caption: 'تلاوة من سورة الفاتحة',
  hashtags: ['#قرآن'],
  skipOptional: false,
});
const sql = (query: string, ...values: unknown[]): unknown => db.prepare(query).get(...values);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T06:00:00Z'));
  vi.clearAllMocks();
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
    VIDEO_STUDIO_ASSETS: {},
    VIDEO_STUDIO_PRIVATE: {},
    STUDIO_ENABLED: '1',
    STUDIO_SIGNING_SECRET: 'test-signing-secret',
    STUDIO_AUTOMATION_EMAIL_HASH: 'configured',
    STUDIO_ORIGIN: 'https://studio.example',
    STUDIO_MODAL_URL: 'https://renderer.example',
    STUDIO_MODAL_KEY: 'key',
    STUDIO_MODAL_SECRET: 'secret',
    AI: { run: mocks.ai },
  } as unknown as StudioEnv;
  mocks.catalogue.mockResolvedValue(catalogue);
  mocks.candidates.mockResolvedValue([candidate]);
  mocks.ai.mockImplementation(async () => ({
    choices: [{ message: { content: JSON.stringify(decision()) }, finish_reason: 'stop' }],
  }));
  mocks.resolve.mockImplementation(
    async (_env, _owner, spec) =>
      ({
        version: '1',
        renderVersion: 'studio-1',
        spec,
        verses: [],
        fonts: [],
        audio: { url: 'https://audio.qurancdn.com/test.mp3', startMs: 0, endMs: 45000 },
        background: { type: 'image', url: 'https://studio.example/background' },
        durationMs: 45000,
        width: 1080,
        height: 1920,
        fps: 30,
      } as ResolvedVideoManifest),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ callId: 'fc-test' })),
  );
});
afterEach(() => {
  db.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('automatic video generation', () => {
  it('validates model-selected image sequences and enables gentle animation', () => {
    const images = [
      catalogue.backgrounds[0],
      { ...catalogue.backgrounds[0], id: 'r2-second' },
      { ...catalogue.backgrounds[0], id: 'r2-third' },
    ];
    const selected = validateAutomationDecision(
      { ...decision(), backgroundIds: images.map((image) => image.id) },
      [candidate],
      { ...catalogue, backgrounds: images },
      false,
    );
    expect(selected.spec.background).toMatchObject({
      animate: true,
      slides: ['r2-calm', 'r2-second', 'r2-third'],
    });
    expect(() =>
      validateAutomationDecision(
        { ...decision(), backgroundIds: ['r2-calm', 'r2-unknown'] },
        [candidate],
        catalogue,
        false,
      ),
    ).toThrow('AUTOMATION_INVALID_DECISION');
  });
  it.each([
    ['2026-10-26T06:00:00Z', 9, 0],
    ['2026-10-26T11:00:00Z', 14, 1],
    ['2026-10-26T16:00:00Z', 19, 2],
    ['2026-11-10T07:00:00Z', 9, 0],
    ['2026-11-10T12:00:00Z', 14, 1],
    ['2026-11-10T17:00:00Z', 19, 2],
    ['2026-10-26T07:00:00Z', 10, -1],
  ])('uses Cairo DST for %s', (time, hour, slot) => {
    expect(automationClock(Date.parse(time)).hour).toBe(hour);
    expect(dueAutomationSlot(Date.parse(time))).toBe(slot);
  });
  it('requires the verified configured owner and prevents reassigning the singleton', async () => {
    const req = new Request('https://studio.example/api/video-studio/automation');
    await expect(
      automationRequest(env, req, { ...owner, canAutomate: false }, undefined, {}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await configureAutomation(env, owner, true, true);
    await expect(
      configureAutomation(env, { ...owner, id: 'user:other' }, true, true),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(readAutomation(env, { ...owner, id: 'user:other' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('reserves one slot atomically, respects five hours, and never runs a disabled third slot', async () => {
    await configureAutomation(env, owner, true, false);
    const settings = await readAutomationSettings(env);
    const results = await Promise.all([
      enqueueAutomation(env, settings, Date.now()),
      enqueueAutomation(env, settings, Date.now()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-26T10:59:00Z'));
    await expect(enqueueAutomation(env, settings, Date.now(), true)).rejects.toMatchObject({
      code: 'AUTOMATION_INTERVAL',
    });
    vi.setSystemTime(new Date('2026-10-26T11:00:00Z'));
    expect(await enqueueAutomation(env, settings, Date.now())).toBeTruthy();
    vi.setSystemTime(new Date('2026-10-26T16:00:00Z'));
    expect(await enqueueAutomation(env, settings, Date.now())).toBeNull();
    expect(sql('SELECT count(*) AS count FROM studio_automation_runs')).toEqual({ count: 2 });
  });
  it('selects, creates one ordinary quota-charged job, and reconciles completion', async () => {
    await configureAutomation(env, owner, true, true);
    await Promise.all([maintainAutomation(env), maintainAutomation(env)]);
    let state = await readAutomation(env, owner);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].status).toBe('ready');
    expect(mocks.ai).toHaveBeenCalledTimes(1);
    expect(mocks.ai).toHaveBeenCalledWith(
      AUTOMATION_MODEL,
      expect.objectContaining({ max_tokens: 450 }),
    );
    // Workers AI's live grammar rejects this keyword; uniqueness is validated on the server.
    expect(
      mocks.ai.mock.calls[0][1].response_format.json_schema.properties.backgroundIds,
    ).not.toHaveProperty('uniqueItems');
    await maintainAutomation(env);
    state = await readAutomation(env, owner);
    expect(state.runs[0].status).toBe('submitted');
    expect(sql('SELECT count(*) AS count FROM studio_jobs')).toEqual({ count: 1 });
    expect(sql('SELECT owner,daily_limit,duration_ms FROM studio_jobs')).toEqual({
      owner: owner.id,
      daily_limit: 10,
      duration_ms: 45000,
    });
    db.prepare("UPDATE studio_jobs SET status='completed'").run();
    await maintainAutomation(env);
    expect((await readAutomation(env, owner)).runs[0].status).toBe('completed');
  });
  it('cannot insert a project when pause wins a race with the model response', async () => {
    await configureAutomation(env, owner, true, true);
    mocks.ai.mockImplementationOnce(async () => {
      await configureAutomation(env, owner, false, true);
      return {
        choices: [{ message: { content: JSON.stringify(decision()) }, finish_reason: 'stop' }],
      };
    });
    await maintainAutomation(env);
    expect(sql('SELECT count(*) AS count FROM studio_projects')).toEqual({ count: 0 });
    expect(sql('SELECT count(*) AS count FROM studio_jobs')).toEqual({ count: 0 });
    expect((await readAutomation(env, owner)).runs[0].status).toBe('skipped');
  });
  it('reconciles a crash after job insertion without rendering twice', async () => {
    await configureAutomation(env, owner, true, true);
    await maintainAutomation(env);
    await maintainAutomation(env);
    db.prepare("UPDATE studio_automation_runs SET status='ready',job_id=NULL,lease_until=0").run();
    await maintainAutomation(env);
    expect(sql('SELECT count(*) AS count FROM studio_jobs')).toEqual({ count: 1 });
    expect((await readAutomation(env, owner)).runs[0].status).toBe('submitted');
  });
  it('checks the pause atomically when it races with manifest resolution', async () => {
    await configureAutomation(env, owner, true, true);
    await maintainAutomation(env);
    const resolve = mocks.resolve.getMockImplementation();
    mocks.resolve.mockImplementationOnce(async (...args) => {
      const manifest = await resolve(...args);
      await configureAutomation(env, owner, false, true);
      return manifest;
    });
    await maintainAutomation(env);
    expect(sql('SELECT count(*) AS count FROM studio_jobs')).toEqual({ count: 0 });
  });
  it('rejects a changed recording duration before reserving a render', async () => {
    await configureAutomation(env, owner, true, true);
    await maintainAutomation(env);
    mocks.resolve.mockResolvedValueOnce({ durationMs: 71000 });
    await maintainAutomation(env);
    expect(sql('SELECT count(*) AS count FROM studio_jobs')).toEqual({ count: 0 });
    expect((await readAutomation(env, owner)).runs[0].error).toBe('AUTOMATION_DURATION_CHANGED');
  });
  it('allows only a third optional decision to skip', () => {
    expect(
      validateAutomationDecision(
        { ...decision(), skipOptional: true },
        [candidate],
        catalogue,
        true,
      ),
    ).toBeNull();
    expect(() =>
      validateAutomationDecision(
        { ...decision(), skipOptional: true },
        [candidate],
        catalogue,
        false,
      ),
    ).toThrow('AUTOMATION_INVALID_DECISION');
  });
  it.each([
    { candidateId: 'injected' },
    { backgroundId: 'https://evil.test/image' },
    { translationId: 9999 },
    { hashtags: ['bad tag'] },
    { font: 'missing' },
  ])('rejects unverified model selections %j', (override) => {
    expect(() =>
      validateAutomationDecision({ ...decision(), ...override }, [candidate], catalogue, false),
    ).toThrow();
  });
  it('caps actual model calls at twelve per UTC day and never calls another provider', async () => {
    for (let i = 0; i < 12; i += 1) await chooseAutomationPlan(env, [candidate], catalogue, false);
    await expect(chooseAutomationPlan(env, [candidate], catalogue, false)).rejects.toMatchObject({
      code: 'AUTOMATION_AI_LIMIT',
    });
    expect(mocks.ai).toHaveBeenCalledTimes(12);
    expect(fetch).not.toHaveBeenCalled();
    vi.setSystemTime(new Date('2026-10-26T23:59:59Z'));
    await expect(chooseAutomationPlan(env, [candidate], catalogue, false)).rejects.toThrow();
    vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
    await expect(chooseAutomationPlan(env, [candidate], catalogue, false)).resolves.toBeTruthy();
  });
  it('bounds retries and reports an exhausted model failure', async () => {
    await configureAutomation(env, owner, true, true);
    mocks.ai.mockRejectedValue(new Error('temporary provider failure'));
    for (let i = 0; i < 3; i += 1) {
      await maintainAutomation(env);
      vi.setSystemTime(Date.now() + 60000);
    }
    await maintainAutomation(env);
    expect((await readAutomation(env, owner)).runs[0].status).toBe('failed');
    expect(mocks.ai).toHaveBeenCalledTimes(3);
  });
  it('waits for a busy owner without exhausting retries or spending more AI requests', async () => {
    await configureAutomation(env, owner, true, true);
    await maintainAutomation(env);
    mocks.resolve.mockRejectedValue(Object.assign(new Error('OWNER_BUSY'), { code: 'OWNER_BUSY' }));
    for (let i = 0; i < 4; i += 1) {
      await maintainAutomation(env);
      vi.setSystemTime(Date.now() + 60000);
    }
    const run = (await readAutomation(env, owner)).runs[0];
    expect(run.status).toBe('ready');
    expect(run.error).toBe('OWNER_BUSY');
    expect(mocks.ai).toHaveBeenCalledTimes(1);
  });
  it('does not backfill missed dates on restart', async () => {
    await configureAutomation(env, owner, true, true);
    await maintainAutomation(env);
    vi.setSystemTime(new Date('2026-10-27T02:00:00Z'));
    await maintainAutomation(env);
    const state = await readAutomation(env, owner);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].error).toBe('AUTOMATION_MISSED');
  });
});
