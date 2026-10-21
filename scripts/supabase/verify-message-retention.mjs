// Isolated PostgreSQL-compatible verification. No network or production writes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE ??
    '../../.local-runtime/verification-node-modules/@electric-sql/pglite/dist/index.js'
);
const db = new PGlite();
const includeStudentRedesign =
  existsSync('supabase/migrations/20261020231431_tilawa_student_account_redesign.sql') &&
  !process.argv.includes('--deployed-schema');
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
let checks = 0;
const check = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks++;
  console.log(`PASS ${label}`);
};
const actor = async (n) =>
  db.exec(`reset role;set request.jwt.claim.sub='${uid(n)}';set role authenticated`);
const command = async (action, payload, key = crypto.randomUUID()) =>
  (await query('select public.tilawa_command($1,$2,$3) result', [action, payload, key]))[0].result;

try {
  await db.exec(`create role anon;create role authenticated;
    create schema auth;create schema storage;create schema cron;create schema extensions;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create table auth.sessions(id uuid,user_id uuid,not_after timestamptz);
    create table auth.mfa_factors(id uuid default gen_random_uuid(),user_id uuid,status text,factor_type text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('sub',auth.uid(),'aal','aal1')$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,created_at timestamptz default now());
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create table cron.job(jobid bigint primary key,jobname text,active boolean default true,schedule text,command text);
    create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job(jobid,jobname,schedule,command) values((select count(*)+1 from cron.job),$1,$2,$3) returning jobid$$;
    grant usage on schema auth,storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant select on storage.objects to anon;
    create publication supabase_realtime;`);
  const retention = '20261021125307_tilawa_inactive_conversation_retention.sql';
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (file >= retention) continue;
    if (!includeStudentRedesign && file === '20261020231431_tilawa_student_account_redesign.sql')
      continue;
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
        /create extension if not exists pg_cron with schema extensions;/g,
        '',
      ),
    );
  }
  await db.exec(`insert into auth.users(id,email)
    select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.invalid' from generate_series(1,12) n;
    insert into public.teacher_profiles(user_id,slug,display_name,approval) values('${uid(
      1,
    )}','teacher-test','Teacher','approved');
    insert into public.direct_conversations(id,teacher_id,student_id,requested_by,request_status)
    select ('00000000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,'${uid(1)}',
      ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      case n when 6 then 'pending' when 7 then 'rejected' else 'accepted' end from generate_series(2,8) n;
    insert into public.direct_messages(conversation_id,sender_id,body,created_at) values
      ('${uid(102)}','${uid(1)}','old unread',now()-interval '61 days'),
      ('${uid(103)}','${uid(3)}','very old in active conversation',now()-interval '1 year'),
      ('${uid(103)}','${uid(1)}','active',now()-interval '1 day'),
      ('${uid(104)}','${uid(1)}','just before cutoff',now()-interval '59 days 23 hours'),
      ('${uid(106)}','${uid(6)}','pending introduction',now()-interval '61 days'),
      ('${uid(107)}','${uid(7)}','rejected introduction',now()-interval '61 days');
    insert into public.direct_conversation_user_states(conversation_id,user_id,blocked,last_read_at)
      values('${uid(102)}','${uid(1)}',true,now());`);
  // This is the exact migration used for deployment, including its backfill and ACLs.
  await db.exec(readFileSync(`supabase/migrations/${retention}`, 'utf8'));
  check(
    (
      await query(
        'select last_message_at is not null tracked from public.direct_conversations where id=$1',
        [uid(102)],
      )
    )[0].tracked,
    true,
    'existing message activity is backfilled',
  );
  check(
    (
      await query("select schedule,command from cron.job where jobname='tilawa-message-retention'")
    )[0],
    { schedule: '*/5 * * * *', command: 'select private.tilawa_purge_inactive_messages()' },
    'cleanup is scheduled every five minutes',
  );
  await actor(2);
  if (includeStudentRedesign)
    check(
      (await query('select public.tilawa_account_bootstrap() a'))[0].a.unreadMessages,
      1,
      'expired unread message initially counted',
    );
  await command('conversation', { conversationId: uid(102), operation: 'read' });
  await db.exec('reset role');
  check(
    (
      await query(
        "select last_message_at<=now()-interval '60 days' inactive from public.direct_conversations where id=$1",
        [uid(102)],
      )
    )[0].inactive,
    true,
    'reading and blocking do not renew message activity',
  );
  // Keep receipt privacy and exact-key retries covered for conversationId and peerId sends.
  const retryKey = crypto.randomUUID();
  const peerKey = crypto.randomUUID();
  const payload = { conversationId: uid(102), text: 'old unread' };
  const peerPayload = { peerId: uid(1), text: 'older peer message' };
  await query(
    `insert into private.action_receipts(user_id,request_key,action,payload,result)
    values($1,$2,'message',$3,$4),($1,$5,'message',$6,$4)`,
    [uid(2), retryKey, payload, { id: uid(102) }, peerKey, peerPayload],
  );
  await db.exec('begin');
  // Same transaction provides an exact, stable 60-day boundary.
  await query(
    `insert into public.direct_messages(conversation_id,sender_id,body,created_at)
    values($1,$2,'exact boundary',now()-interval '60 days')`,
    [uid(108), uid(8)],
  );
  check(
    (await query('select private.tilawa_purge_inactive_messages() n'))[0].n,
    4,
    'all messages at or beyond sixty inactive days are deleted',
  );
  check(
    (await query('select private.tilawa_purge_inactive_messages() n'))[0].n,
    0,
    'cleanup can run repeatedly',
  );
  await db.exec('commit');
  check(
    (await query('select count(*)::int n from public.direct_conversations'))[0].n,
    7,
    'all conversation records survive',
  );
  check(
    (
      await query('select count(*)::int n from public.direct_messages where conversation_id=$1', [
        uid(103),
      ])
    )[0].n,
    2,
    'active conversation keeps even year-old history',
  );
  check(
    (
      await query('select count(*)::int n from public.direct_messages where conversation_id=$1', [
        uid(104),
      ])
    )[0].n,
    1,
    'conversation younger than sixty days survives',
  );
  check(
    (
      await query('select last_message_at from public.direct_conversations where id=$1', [uid(102)])
    )[0].last_message_at,
    null,
    'purged conversation signals an empty history',
  );
  check(
    (
      await query(
        'select blocked from public.direct_conversation_user_states where conversation_id=$1 and user_id=$2',
        [uid(102), uid(1)],
      )
    )[0].blocked,
    true,
    'participant block survives',
  );
  check(
    (
      await query('select request_status from public.direct_conversations where id=$1', [uid(106)])
    )[0].request_status,
    'pending',
    'request acceptance is not fabricated',
  );
  check(
    (
      await query('select request_status from public.direct_conversations where id=$1', [uid(107)])
    )[0].request_status,
    'rejected',
    'rejection survives',
  );
  check(
    (
      await query(
        "select count(*)::int n from private.action_receipts where action='message' and payload='{}'::jsonb and payload_hash is not null",
      )
    )[0].n,
    2,
    'duplicate bodies are erased while receipts survive',
  );
  await actor(2);
  check(
    (await query("select public.tilawa_account_view('messages') a"))[0].a.conversations.some(
      (c) => c.id === uid(102),
    ),
    true,
    'empty conversation stays in the participant inbox',
  );
  if (includeStudentRedesign)
    check(
      (await query('select public.tilawa_account_bootstrap() a'))[0].a.unreadMessages,
      0,
      'purged messages no longer count as unread',
    );
  if (includeStudentRedesign)
    check(
      (await query("select public.tilawa_account_view('home') a"))[0].a.recentConversations,
      [],
      'overview exposes no stale message preview',
    );
  check(
    await command('message', payload, retryKey),
    { id: uid(102) },
    'original request retry returns its old receipt',
  );
  check(
    await command('message', peerPayload, peerKey),
    { id: uid(102) },
    'peer-based original retry also stays idempotent',
  );
  await assert.rejects(
    () => command('message', { ...payload, text: 'different' }, retryKey),
    /IDEMPOTENCY_CONFLICT/,
  );
  checks++;
  check(
    (
      await query('select count(*)::int n from public.direct_messages where conversation_id=$1', [
        uid(102),
      ])
    )[0].n,
    0,
    'expired requests never resend deleted messages',
  );
  await assert.rejects(
    () => command('message', { ...payload, text: 'blocked fresh send' }),
    /MESSAGE_REQUEST_PENDING_OR_BLOCKED/,
  );
  checks++;
  await actor(1);
  await command('conversation', { conversationId: uid(102), operation: 'unblock' });
  await actor(2);
  await command('message', { ...payload, text: 'new after cleanup' });
  check(
    (
      await query('select count(*)::int n from public.direct_messages where conversation_id=$1', [
        uid(102),
      ])
    )[0].n,
    1,
    'accepted empty conversation can receive new messages',
  );
  await db.exec('reset role');
  check(
    (
      await query(
        "select last_message_at>now()-interval '1 minute' active from public.direct_conversations where id=$1",
        [uid(102)],
      )
    )[0].active,
    true,
    'successful send restarts the inactivity period',
  );
  for (const role of ['anon', 'authenticated']) {
    for (const fn of [
      'tilawa_purge_inactive_messages()',
      'tilawa_track_message_activity()',
      'tilawa_command_before_retention(text,jsonb,uuid)',
    ]) {
      check(
        (
          await query("select has_function_privilege($1,$2,'execute') allowed", [
            role,
            `private.${fn}`,
          ])
        )[0].allowed,
        false,
        `${role} cannot execute ${fn}`,
      );
    }
  }
  await actor(9);
  check(
    (await query('select count(*)::int n from public.direct_messages'))[0].n,
    0,
    'unrelated user cannot read messages',
  );
  await assert.rejects(() => command('message', { ...payload, text: 'unauthorized' }), /FORBIDDEN/);
  checks++;
  await db.exec(`reset role;
    insert into auth.users(id,email)
      select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'batch'||n||'@example.invalid' from generate_series(1000,1104) n;
    insert into public.direct_conversations(id,teacher_id,student_id,requested_by,request_status)
      select ('00000000-0000-4000-8000-'||lpad((n+10000)::text,12,'0'))::uuid,'${uid(1)}',
      ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'accepted' from generate_series(1000,1104) n;
    insert into public.direct_messages(conversation_id,sender_id,body,created_at)
      select ('00000000-0000-4000-8000-'||lpad((n+10000)::text,12,'0'))::uuid,'${uid(
        1,
      )}','batch',now()-interval '61 days' from generate_series(1000,1104) n;`);
  check(
    (await query('select private.tilawa_purge_inactive_messages() n'))[0].n,
    100,
    'one cleanup run is bounded to one hundred conversations',
  );
  check(
    (await query('select private.tilawa_purge_inactive_messages() n'))[0].n,
    5,
    'subsequent run drains the remaining inactive conversations',
  );
  console.log(`${checks} isolated message retention checks passed`);
} finally {
  await db.close();
}
