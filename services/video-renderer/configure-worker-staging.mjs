import fs from 'node:fs/promises';
import dotenv from 'dotenv';

// This file only prepares bindings for the NEW Cloudflare staging Worker (the website server).
// It never invokes Modal or forwards content-provider/account keys to the renderer.
const bindings = JSON.parse(await fs.readFile('.local-runtime/studio-worker-staging.json', 'utf8'));
delete bindings.STUDIO_ORIGIN; // Already a non-secret variable in the exact staging config.
const source = dotenv.config({ path: '.env' }).parsed ?? {};
for (const name of [
  'QURAN_CLIENT_ID',
  'QURAN_CLIENT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
])
  if (source[name]) bindings[name] = source[name];
bindings.STUDIO_MODAL_URL = 'https://mu7medy--tilawa-video-studio-staging-api.us-east.modal.run';
bindings.STUDIO_TURNSTILE_SITE_KEY = '0x4AAAAAAFjy-I3LAgTRv5cK';
await fs.writeFile('.local-runtime/studio-cloudflare-only-staging.json', JSON.stringify(bindings), {
  mode: 0o600,
});
console.log(
  JSON.stringify({
    destination: 'Cloudflare staging only',
    configuredBindingNames: Object.keys(bindings),
  }),
);
