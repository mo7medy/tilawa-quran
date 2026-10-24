import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

// Local provisioning helper: all generated credentials stay in the ignored user runtime folder.
// Never run this against production; configure production secrets in the platform's secret manager.
const python = process.argv[2];
if (!python) throw new Error('Pass the absolute path to the authenticated Modal Python runtime.');
await fs.mkdir('.local-runtime', { recursive: true });
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(python, ['-m', 'modal', ...args], {
      env: { ...process.env, PYTHONUTF8: '1' },
    });
    let stdout = '';
    child.stdout.on('data', (bytes) => {
      stdout += bytes;
    });
    child.stderr.resume();
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve(stdout)
        : reject(
            new Error(`Modal provisioning failed: ${args[0]}. Inspect your authenticated profile.`),
          ),
    );
  });
const secretPath = '.local-runtime/studio-modal-staging.json';
let values;
try {
  values = JSON.parse(await fs.readFile(secretPath, 'utf8'));
} catch {
  values = {
    STUDIO_ORIGIN: 'https://tilawa-video-studio-staging.muhammad5mdk.workers.dev',
    STUDIO_SIGNING_SECRET: randomBytes(48).toString('base64url'),
  };
  await fs.writeFile(secretPath, JSON.stringify(values), { mode: 0o600 });
}
await run([
  'secret',
  'create',
  'tilawa-video-studio-staging',
  '--from-json',
  secretPath,
  '--force',
]);
const proxyPath = '.local-runtime/studio-modal-proxy-staging.json';
try {
  await fs.access(proxyPath);
} catch {
  const token = await run([
    'workspace',
    'proxy-tokens',
    'create',
    '--name',
    'Tilawa video studio staging',
    '--json',
  ]);
  await fs.writeFile(proxyPath, token, { mode: 0o600 });
}
const proxy = JSON.parse(await fs.readFile(proxyPath, 'utf8'));
const worker = { ...values };
// The CLI JSON schema is checked before any credential is forwarded to another service.
const key = proxy['Modal-Key'];
const secret = proxy['Modal-Secret'];
if (!key || !secret)
  throw new Error(`Unrecognized proxy token JSON keys: ${Object.keys(proxy).join(',')}`);
worker.STUDIO_MODAL_KEY = key;
worker.STUDIO_MODAL_SECRET = secret;
await fs.writeFile('.local-runtime/studio-worker-staging.json', JSON.stringify(worker), {
  mode: 0o600,
});
console.log(
  JSON.stringify({
    configured:
      'Modal staging signing secret and private proxy token; no existing content or account credentials were read',
  }),
);
