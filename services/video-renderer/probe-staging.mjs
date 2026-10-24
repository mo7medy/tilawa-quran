import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Administrative integration fixtures only; the public upload/challenge API is never modified.
const origin = 'https://tilawa-video-studio-staging.muhammad5mdk.workers.dev';
const file = '.local-runtime/studio-probe-runs.json';
const action = process.argv[2];
const request = async (path, cookie, options = {}) =>
  fetch(`${origin}/api/video-studio/${path}`, {
    ...options,
    headers: { Origin: origin, Cookie: cookie ?? '', ...options.headers },
  });
if (action === 'prepare') {
  const cases = [
    { name: 'valid-image', mime: 'image/png', source: '.local-runtime/studio-upload-valid.png' },
    {
      name: 'invalid-image',
      mime: 'image/png',
      source: '.local-runtime/studio-upload-invalid.png',
    },
    { name: 'valid-video', mime: 'video/mp4', source: '.local-runtime/studio-upload-valid.mp4' },
  ];
  const sql = [];
  for (const item of cases) {
    const response = await request('session');
    if (!response.ok) throw new Error('Staging session unavailable');
    item.cookie = response.headers.get('set-cookie').split(';')[0];
    item.owner = (await response.json()).scope;
    item.id = randomUUID();
    const size = (await fs.stat(item.source)).size;
    const now = Date.now();
    sql.push(
      `INSERT INTO studio_assets(id,owner,registered,object_key,size,mime,status,created_at,expires_at) VALUES('${
        item.id
      }','${item.owner}',0,'uploads/${item.id}',${size},'${item.mime}','pending',${now},${
        now + 86400000
      });`,
    );
  }
  await fs.writeFile(file, JSON.stringify(cases), { mode: 0o600 });
  await fs.writeFile('.local-runtime/studio-probe-seed.sql', sql.join('\n'), { mode: 0o600 });
  console.log(JSON.stringify({ prepared: cases.length, target: 'isolated staging' }));
} else if (action === 'seed') {
  const require = createRequire(import.meta.url);
  const cli = require.resolve('wrangler/package.json').replace(/package\.json$/, 'bin/wrangler.js');
  process.exitCode = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'VIDEO_STUDIO_DB',
      '--remote',
      '--config',
      'wrangler.video-studio.staging.jsonc',
      '--file',
      '.local-runtime/studio-probe-seed.sql',
    ],
    { stdio: 'inherit' },
  ).status;
} else {
  const cases = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const item of cases) {
    const response =
      action === 'upload'
        ? await request(`uploads/${item.id}`, item.cookie, {
            method: 'PUT',
            headers: { 'Content-Type': item.mime },
            body: await fs.readFile(item.source),
          })
        : await request(`uploads/${item.id}`, item.cookie);
    const data = await response.json();
    console.log(
      JSON.stringify({
        name: item.name,
        status: response.status,
        state: data.status,
        error: data.error?.code,
      }),
    );
    if (action === 'upload' && response.status !== 202) process.exitCode = 1;
  }
}
