import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';

export const PROJECT_REF = 'gsoelrejabrmzqypdchv';
export const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
export const cli = (...args) =>
  execFileSync('supabase', args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
export const projectKeys = () =>
  JSON.parse(cli('projects', 'api-keys', '--project-ref', PROJECT_REF, '--output', 'json'));
export const assertProject = () => {
  const projects = JSON.parse(cli('projects', 'list', '--output', 'json'));
  const project = projects.find((item) => item.id === PROJECT_REF);
  if (!project || project.name !== 'Tilawa web' || project.status !== 'ACTIVE_HEALTHY') {
    throw new Error('Target project identity/health did not match. No database changes performed.');
  }
};
export const assertLinkedProject = () => {
  const path = 'supabase/.temp/project-ref';
  if (!existsSync(path) || readFileSync(path, 'utf8').trim() !== PROJECT_REF) {
    throw new Error(
      'Linked project does not match the independent website. No database operation performed.',
    );
  }
};
if (process.argv[2] === 'configure') {
  assertProject();
  const keys = projectKeys();
  const key =
    keys.find((item) => item.type === 'publishable') ?? keys.find((item) => item.name === 'anon');
  if (!key?.api_key) throw new Error('No public client key found');
  const current = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
  if (/^NEXT_PUBLIC_SUPABASE_URL=/m.test(current))
    throw new Error('Supabase is already configured; inspect without overwriting it.');
  appendFileSync(
    '.env',
    `\n# Independent Tilawa website project. Public browser configuration only.\nNEXT_PUBLIC_SUPABASE_URL=${PROJECT_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key.api_key}\n`,
  );
  process.stdout.write(
    'Local Supabase public configuration written. No secret/service-role key stored.\n',
  );
}
if (process.argv[2] === 'push') {
  assertProject();
  cli('link', '--project-ref', PROJECT_REF);
  process.stdout.write(cli('db', 'push', '--dry-run'));
  if (process.argv.includes('--apply')) process.stdout.write(cli('db', 'push', '--yes'));
}
