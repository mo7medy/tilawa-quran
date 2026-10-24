import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const origin = 'https://tilawa-video-studio-staging.muhammad5mdk.workers.dev';
const extended = process.env.STUDIO_PROOF_SUITE === 'extended';
const statePath = extended
  ? '.local-runtime/studio-proof-extended-runs.json'
  : '.local-runtime/studio-proof-runs.json';
const action = process.argv[2];
const require = createRequire(import.meta.url);
const wrangler = `${require
  .resolve('wrangler/package.json')
  .replace(/package\.json$/, '')}bin/wrangler.js`;
const request = async (path, body, cookie) => {
  const response = await fetch(`${origin}/api/video-studio/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Origin: origin, Cookie: cookie ?? '', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(`${path.split('/')[0]}: ${data.error?.code ?? response.status}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? cookie };
};
if (action === 'prepare') {
  const baseline = JSON.parse(
    await fs.readFile('.local-runtime/studio-proof-resolved.json', 'utf8'),
  ).manifest.spec;
  const runs = [];
  const statements = [];
  const cases = extended
    ? [
        { font: 'qpc_uthmani_hafs', ratio: 'portrait', quality: 1080 },
        {
          font: 'code_v1',
          ratio: 'landscape',
          quality: 720,
          chapterId: 2,
          from: 5,
          to: 6,
          fontSize: 40,
          translationSize: 22,
        },
        { font: 'code_v2', ratio: 'square', quality: 1080 },
        { font: 'text_indopak', mushafLines: '16_lines', ratio: 'square', quality: 1080 },
        { font: 'tajweed_v4', ratio: 'portrait', quality: 1080 },
      ]
    : ['qpc_uthmani_hafs', 'code_v1', 'code_v2', 'text_indopak', 'tajweed_v4'].map((font) => ({
        font,
      }));
  for (const testCase of cases) {
    const { font } = testCase;
    const session = await request('session');
    const spec = {
      ...baseline,
      font,
      title: `Staging proof ${font}`,
      chapterId: 1,
      from: 1,
      to: 2,
      quality: 720,
      ...testCase,
    };
    const project = await request('projects', { spec }, session.cookie);
    const resolved = await request('resolve', { spec }, session.cookie);
    const id = randomUUID();
    const now = Date.now();
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const values = [
      id,
      session.data.scope,
      project.data.id,
      project.data.revision,
      day,
      2,
      resolved.data.manifest.durationMs,
      JSON.stringify(resolved.data.manifest),
      randomUUID(),
      now,
      now + 86400000,
      104857600,
      100 * 1048576,
    ];
    const sqlValue = (value) =>
      typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`;
    statements.push(
      `INSERT INTO studio_jobs(id,owner,project_id,revision,day,daily_limit,duration_ms,manifest,idempotency,created_at,expires_at,storage_limit,output_reserved) VALUES(${values
        .map(sqlValue)
        .join(',')});`,
    );
    runs.push({
      id,
      font,
      cookie: session.cookie,
      projectId: project.data.id,
      manifest: resolved.data.manifest,
    });
  }
  // Only administrative staging test data is seeded. The public API retains Turnstile and its launch gate.
  await fs.writeFile('.local-runtime/studio-proof-seed.sql', statements.join('\n'), {
    mode: 0o600,
  });
  await fs.writeFile(statePath, JSON.stringify(runs), { mode: 0o600 });
  console.log(
    JSON.stringify({
      prepared: runs.length,
      environment: 'staging',
      publicGenerationEnabled: false,
    }),
  );
} else if (action === 'submit') {
  const runs = JSON.parse(await fs.readFile(statePath, 'utf8'));
  const keys = JSON.parse(await fs.readFile('.local-runtime/studio-worker-staging.json', 'utf8'));
  for (const run of runs) {
    const response = await fetch(
      'https://mu7medy--tilawa-video-studio-staging-api.us-east.modal.run/jobs',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Modal-Key': keys.STUDIO_MODAL_KEY,
          'Modal-Secret': keys.STUDIO_MODAL_SECRET,
        },
        body: JSON.stringify({ jobId: run.id, attempt: 1 }),
      },
    );
    if (!response.ok) throw new Error(`Modal dispatch returned ${response.status}`);
    run.callId = (await response.json()).callId;
  }
  await fs.writeFile(statePath, JSON.stringify(runs), { mode: 0o600 });
  console.log(JSON.stringify({ submitted: runs.length }));
} else if (action === 'status') {
  const runs = JSON.parse(await fs.readFile(statePath, 'utf8'));
  const report = [];
  for (const run of runs) {
    const { data } = await request(`jobs/${run.id}`, undefined, run.cookie);
    report.push({
      font: run.font,
      status: data.status,
      progress: data.progress,
      error: data.error,
      durationMs: run.manifest.durationMs,
    });
  }
  await fs.writeFile('.local-runtime/studio-proof-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} else if (action === 'download') {
  const runs = JSON.parse(await fs.readFile(statePath, 'utf8'));
  await fs.mkdir('tests/video-studio/fixtures', { recursive: true });
  for (const run of runs) {
    const { data } = await request(`jobs/${run.id}/download`, undefined, run.cookie);
    const response = await fetch(data.url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(
      `.local-runtime/studio-proof-${extended ? 'extended-' : ''}${run.font}.mp4`,
      bytes,
    );
    await fs.writeFile(
      extended
        ? `.local-runtime/studio-proof-extended-${run.font}.json`
        : `tests/video-studio/fixtures/${run.font}.json`,
      JSON.stringify(run.manifest, null, 2),
    );
    console.log(JSON.stringify({ font: run.font, downloadedBytes: bytes.length }));
  }
} else if (action === 'seed') {
  const child = spawn(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'VIDEO_STUDIO_DB',
      '--remote',
      '--config',
      'wrangler.video-studio.staging.jsonc',
      '--file',
      '.local-runtime/studio-proof-seed.sql',
    ],
    { stdio: 'inherit' },
  );
  child.on('exit', (code) => {
    process.exitCode = code;
  });
} else
  throw new Error(
    'Choose prepare, seed, submit or status. All actions target isolated staging only.',
  );
