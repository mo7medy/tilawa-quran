import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = path.resolve(process.argv[2] ?? '.video-studio-assets');
const bucket = process.argv[3];
if (!/^[a-z0-9-]{3,64}$/.test(bucket ?? ''))
  throw new Error('Pass the isolated studio asset bucket name.');
const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
const wrangler = path.join(
  path.dirname(require.resolve('wrangler/package.json')),
  'bin/wrangler.js',
);
const upload = (key, mime) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        wrangler,
        'r2',
        'object',
        'put',
        `${bucket}/${key}`,
        '--file',
        path.join(directory, key),
        '--content-type',
        mime,
        '--remote',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    // Never forward raw CLI diagnostics containing credentials or URLs to public CI logs.
    child.stderr.resume();
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Asset publication failed (${key.slice(0, 18)}).`)),
    );
  });
const items = [...new Map(Object.values(manifest.files).map((item) => [item.key, item])).values()];
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await upload(item.key, item.mime);
    }
  }),
);
// Publish the index last; a failed partial upload can never advertise incomplete assets.
await upload('manifest.json', 'application/json');
console.log(JSON.stringify({ published: items.length, assetVersion: manifest.assetVersion }));
