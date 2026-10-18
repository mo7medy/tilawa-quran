import { assertProject, assertLinkedProject, cli } from './project.mjs';

const userId = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId ?? '')) {
  throw new Error('Usage: node scripts/supabase/admin.mjs <existing verified user UUID>');
}
assertProject();
assertLinkedProject();
const result = cli(
  'db',
  'query',
  '--linked',
  `
  insert into private.admin_memberships(user_id)
  select id from auth.users where id='${userId}' and email_confirmed_at is not null
  on conflict(user_id) do nothing;
  select exists(select 1 from private.admin_memberships where user_id='${userId}') as created;
`,
  '--output',
  'json',
);
if (!JSON.parse(result).rows?.[0]?.created)
  throw new Error('No verified user with this UUID. No admin was created.');
process.stdout.write(
  'Trusted administrator membership is ready. Sign out and back in, then open /admin/teachers.\n',
);
