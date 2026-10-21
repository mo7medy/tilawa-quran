// Isolated PostgreSQL-compatible verification: never connects to production.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { PGlite } = await import(
  process.env.PGLITE_MODULE ??
    '../../.local-runtime/verification-node-modules/@electric-sql/pglite/dist/index.js'
);
const db = new PGlite();
let checks = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const check = (value, expected, label) => {
  assert.deepEqual(value, expected, label);
  checks++;
  console.log(`PASS ${label}`);
};
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create schema cron;create schema extensions;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
  create table auth.sessions(id uuid,user_id uuid,not_after timestamptz);
  create table auth.mfa_factors(id uuid default gen_random_uuid(),user_id uuid,status text,factor_type text);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('sub',auth.uid(),'aal',coalesce(nullif(current_setting('request.jwt.claim.aal',true),''),'aal1'),'session_id',nullif(current_setting('request.jwt.claim.session_id',true),''))$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,created_at timestamptz default now());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
  create table cron.job(jobid bigint primary key,jobname text,active boolean default true,schedule text);
  create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz);
  create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
  grant usage on schema auth,storage to anon,authenticated;
  grant select,insert,update,delete on storage.objects to authenticated;
  grant select on storage.objects to anon;
  create publication supabase_realtime;`);
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
      /create extension if not exists pg_cron with schema extensions;/g,
      '',
    );
    try {
      await db.exec(sql);
    } catch (e) {
      console.error(`MIGRATION ${file}: ${e.message}`);
      throw e;
    }
  }
  await db.exec(`insert into auth.users(id,email) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.invalid' from generate_series(1,62) n;
    insert into private.admin_memberships(user_id) values('${uid(1)}');
    insert into auth.sessions(id,user_id) values('${uid(9001)}','${uid(1)}');
    insert into auth.mfa_factors(user_id,status,factor_type) values('${uid(
      1,
    )}','verified','totp');`);
  const actor = async (id, aal = 'aal1') =>
    db.exec(
      `reset role;set request.jwt.claim.sub='${id}';set request.jwt.claim.aal='${aal}';set request.jwt.claim.session_id='${uid(
        9001,
      )}';set role authenticated`,
    );
  await actor(uid(1));
  check(
    (await query('select public.tilawa_admin_access() a'))[0].a,
    { member: true, verified: false },
    'membership bootstrap does not grant MFA assurance',
  );
  await assert.rejects(() => query("select public.tilawa_admin_list('students')"), {
    code: '42501',
  });
  checks++;
  await actor(uid(2), 'aal2');
  await assert.rejects(() => query("select public.tilawa_admin_list('students')"), {
    code: '42501',
  });
  checks++;
  await actor(uid(1), 'aal2');
  const first = (await query("select public.tilawa_admin_list('students') a"))[0].a;
  const second = (
    await query("select public.tilawa_admin_list('students','','all','all',null,null,2) a")
  )[0].a;
  check(first.total, 62, 'full student count');
  check(first.items.length, 25, 'bounded student page');
  check(
    first.items.some((a) => second.items.some((b) => a.id === b.id)),
    false,
    'stable equal-date pagination',
  );
  check(
    Object.hasOwn(first.items[0], 'birth_date'),
    false,
    'directory excludes private student fields',
  );
  for (const section of ['teachers', 'lessons', 'subscriptions', 'audit'])
    check(
      (await query('select public.tilawa_admin_list($1) a', [section]))[0].a.items,
      [],
      `empty ${section} directory`,
    );
  await assert.rejects(() => query("select public.tilawa_admin_list('students','','approved')"), {
    code: '22023',
  });
  checks++;
  await assert.rejects(
    () =>
      query("select public.tilawa_admin_list('students','','all','all','2026-03-01','2026-02-01')"),
    { code: '22023' },
  );
  checks++;
  await db.exec(
    `reset role;insert into public.admin_audit_logs(actor_id,action) select '${uid(
      1,
    )}','admin-settings' from generate_series(1,110);`,
  );
  await actor(uid(1), 'aal2');
  check(
    (await query("select public.tilawa_admin_list('audit','','all','all',null,null,5) a"))[0].a
      .items.length,
    10,
    'audit records beyond the first hundred',
  );
  check(
    (await query('select public.tilawa_admin_health() a'))[0].a.maintenance,
    null,
    'missing maintenance reports unknown',
  );
  await actor(uid(2));
  const boot = (await query('select public.tilawa_account_bootstrap() a'))[0].a;
  check(boot.isAdmin, false, 'ordinary user is not admin');
  check(Object.hasOwn(boot, 'messages'), false, 'bootstrap does not load message history');
  for (const view of [
    'profile',
    'home',
    'dashboard',
    'lessons',
    'requests',
    'packages',
    'teachers',
    'students',
    'reviews',
    'availability',
    'coupons',
    'earnings',
    'withdrawals',
    'messages',
    'notifications',
  ]) {
    const result = (await query('select public.tilawa_account_view($1) a', [view]))[0].a;
    check(typeof result.pagination.total, 'number', `${view} returns a bounded read contract`);
  }
  const teacher = {
    value: {
      country: 'Egypt',
      phone: '+20 12345678',
      experience: 2,
      pricing: 'perLesson',
      monthlyPriceCents: 0,
      monthlyLessons: 8,
      publicProfile: {
        displayName: 'Teacher',
        specialties: ['tajweed'],
        teachingLanguages: ['English'],
        biography: { en: 'About' },
        approach: { en: 'Method' },
        qualifications: [{ en: 'Qualified' }],
        sessionDurationMinutes: 45,
        sessionPriceCents: 1000,
      },
    },
  };
  const command = async (payload, key = crypto.randomUUID(), action = 'teacher') =>
    query('select public.tilawa_command($1,$2,$3) a', [action, payload, key]);
  await assert.rejects(
    () => command({ ...teacher, value: { ...teacher.value, phone: '1' } }),
    /INVALID_TEACHER/,
  );
  checks++;
  await assert.rejects(
    () =>
      command({
        ...teacher,
        value: {
          ...teacher.value,
          publicProfile: { ...teacher.value.publicProfile, qualifications: [] },
        },
      }),
    /INVALID_TEACHER/,
  );
  checks++;
  const key = crypto.randomUUID();
  await command(teacher, key);
  await command(teacher, key);
  checks++;
  await command({}, crypto.randomUUID(), 'submit-teacher');
  checks++;
  const monthly = {
    value: {
      ...teacher.value,
      pricing: 'monthly',
      monthlyPriceCents: 10000,
      publicProfile: { ...teacher.value.publicProfile, sessionPriceCents: 0 },
    },
  };
  const monthlyKey = crypto.randomUUID();
  await command(monthly, monthlyKey);
  await command(monthly, monthlyKey);
  checks++;
  check(
    (await query('select public.tilawa_account_bootstrap() a'))[0].a.teacher.approval,
    'pending',
    'editing cannot self-approve',
  );
  await db.exec(
    `reset role;insert into public.teacher_availability(teacher_id,weekday,start_time,end_time) values('${uid(
      2,
    )}',1,'10:00','12:00');`,
  );
  await actor(uid(2));
  const zoneKey = crypto.randomUUID();
  await command({ zone: 'America/New_York' }, zoneKey, 'time-zone');
  await command({ zone: 'America/New_York' }, zoneKey, 'time-zone');
  check(
    (await query("select public.tilawa_account_view('availability') a"))[0].a.availability.length,
    1,
    'timezone changes preserve weekly availability and support replay',
  );
  await assert.rejects(
    () => command({ zone: 'Invalid/Zone' }, crypto.randomUUID(), 'time-zone'),
    /INVALID_TIME_ZONE/,
  );
  checks++;
  await db.exec(`reset role;
    insert into public.orders(id,student_id,plan_id,kind,subject,amount_cents,terms,status) values('${uid(
      5001,
    )}','${uid(3)}','progress','academy','quran',10000,'{}','paid');
    insert into public.payment_transactions(id,order_id,status,amount_cents) values('${uid(
      5002,
    )}','${uid(5001)}','paid',10000);
    insert into public.student_subscriptions(id,student_id,kind,plan_id,payment_id,subject,included_lessons,duration_minutes,price_cents,gift_lessons,starts_at,ends_at,access_ends_at)
    values('${uid(5003)}','${uid(3)}','academy','progress','${uid(
    5002,
  )}','quran',12,45,10000,1,now(),now()+interval '30 days',now()+interval '35 days');
    insert into public.subscription_credit_ledger(subscription_id,bucket,operation,delta,event_key) values('${uid(
      5003,
    )}','regular','reserve',-1,'test-reserve');`);
  await actor(uid(3));
  const subscription = (await query("select public.tilawa_account_view('packages') a"))[0].a
    .subscriptions[0];
  check(
    subscription.credits_summary.remaining,
    11,
    'package page carries full-ledger available credit',
  );
  check(subscription.credits_summary.reserved, 1, 'package reservation separate from used credit');
  check(subscription.credits_summary.used, 0, 'reservation does not consume lesson');
  await actor(uid(1), 'aal2');
  check(
    (await query("select public.tilawa_admin_list('subscriptions') a"))[0].a.items[0].credits
      .remaining,
    11,
    'administrator subscription credits match participant credits',
  );
  await actor(uid(2));
  await db.exec(
    `reset role;insert into public.notifications(user_id,event_key,kind,path) select '${uid(
      2,
    )}','test:'||n,'message','/profile/messages' from generate_series(1,55) n;`,
  );
  await actor(uid(2));
  check(
    (await query("select public.tilawa_account_view('notifications',null,3) a"))[0].a.notifications
      .length,
    5,
    'notification history beyond first fifty',
  );
  check(
    (await query('select public.tilawa_account_bootstrap() a'))[0].a.unreadNotifications,
    55,
    'unread count independent of visible page',
  );
  await db.exec(`reset role;
    update public.teacher_profiles set approval='approved' where user_id='${uid(2)}';
    insert into public.booking_requests(id,student_id,teacher_id,subject,lesson_type,funding_source,scheduled_at,duration_minutes,amount_cents,payment_status,status)
    select ('00000000-0000-4000-8000-'||lpad((2000+n)::text,12,'0'))::uuid,'${uid(3)}','${uid(
    2,
  )}','quran','intro','free_intro',now()+n*interval '1 day',30,0,'not_required','accepted' from generate_series(1,35) n;
    insert into public.lessons(id,booking_id,student_id,teacher_id,subject,lesson_type,funding_source,scheduled_at,duration_minutes,payment_status)
    select ('00000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad((2000+n)::text,12,'0'))::uuid,'${uid(
      3,
    )}','${uid(
    2,
  )}','quran','intro','free_intro',now()+n*interval '1 day',30,'not_required' from generate_series(1,35) n;
    insert into public.direct_conversations(id,teacher_id,student_id,requested_by,request_status) values('${uid(
      3001,
    )}','${uid(2)}','${uid(3)}','${uid(3)}','accepted'),('${uid(3002)}','${uid(2)}','${uid(
    4,
  )}','${uid(4)}','accepted');
    insert into public.direct_messages(conversation_id,sender_id,body,created_at) values('${uid(
      3001,
    )}','${uid(3)}','Old conversation message',now()-interval '1 year');
    insert into public.direct_messages(conversation_id,sender_id,body) select '${uid(3002)}','${uid(
    4,
  )}','Recent '||n from generate_series(1,220) n;
  `);
  await actor(uid(3));
  const lessonsPage = (
    await query("select public.tilawa_account_view('lessons',null,2,'scheduled') a")
  )[0].a;
  check(lessonsPage.lessons.length, 10, 'participant lesson history second page');
  check(lessonsPage.pagination.total, 35, 'lesson total independent of page');
  check(lessonsPage.teachers[0].user_id, uid(2), 'page resolves its teacher identity');
  const detail = (
    await query('select public.tilawa_account_view($1,$2) a', ['lesson', uid(1001)])
  )[0].a;
  check(detail.lessons[0].id, uid(1001), 'participant lesson details');
  check(
    (
      await query('select body from public.direct_messages where conversation_id=$1', [uid(3001)])
    )[0].body,
    'Old conversation message',
    'RLS history query sees old selected conversation',
  );
  await actor(uid(4));
  check(
    (await query('select public.tilawa_account_view($1,$2) a', ['lesson', uid(1001)]))[0].a.lessons,
    [],
    'unrelated account cannot read lesson details',
  );
  check(
    (await query('select body from public.direct_messages where conversation_id=$1', [uid(3001)]))
      .length,
    0,
    'unrelated account cannot read conversation',
  );
  await actor(uid(1), 'aal2');
  const lessonDirectory = (await query("select public.tilawa_admin_list('lessons') a"))[0].a;
  check(lessonDirectory.total, 35, 'administrator lesson directory uses actual records');
  check(
    Object.hasOwn(lessonDirectory.items[0], 'meeting_url'),
    false,
    'administrator directory excludes meeting URL',
  );
  await actor(uid(2));
  check(
    (await query("select public.tilawa_account_view('students') a"))[0].a.people[0].id,
    uid(3),
    'teacher student directory uses authorized relationships',
  );
  check(
    (
      await query('select public.tilawa_upload_referenced($1,$2) a', [
        'tilawa-avatars',
        `${uid(2)}/new.png`,
      ])
    )[0].a,
    false,
    'unreferenced own new upload can be compensated',
  );
  await assert.rejects(
    () =>
      query('select public.tilawa_upload_referenced($1,$2) a', [
        'tilawa-avatars',
        `${uid(3)}/new.png`,
      ]),
    { code: '42501' },
  );
  checks++;
  await db.exec(
    `reset role;update public.teacher_profiles set avatar_path='${uid(
      2,
    )}/shared.png' where user_id='${uid(2)}';`,
  );
  await actor(uid(2));
  check(
    (
      await query('select public.tilawa_upload_referenced($1,$2) a', [
        'tilawa-avatars',
        `${uid(2)}/shared.png`,
      ])
    )[0].a,
    true,
    'teacher-referenced avatar is not treated as orphan',
  );
  await actor(uid(3));
  check(
    (await query("select public.tilawa_account_view('notifications') a"))[0].a.pagination.total,
    0,
    'notification ownership',
  );
  await db.exec('reset role;set role anon');
  await assert.rejects(() => query("select public.tilawa_account_view('home')"), { code: '42501' });
  checks++;
  await assert.rejects(
    () => query("select private.tilawa_command_core('student','{}',gen_random_uuid())"),
    { code: '42501' },
  );
  checks++;
  await actor(uid(1), 'aal2');
  await db.exec('reset role;delete from auth.mfa_factors');
  await actor(uid(1), 'aal2');
  await assert.rejects(() => query("select public.tilawa_admin_list('students')"), {
    code: '42501',
  });
  checks++;
  await db.exec(
    `reset role;insert into auth.mfa_factors(user_id,status,factor_type) values('${uid(
      1,
    )}','verified','totp');delete from auth.sessions;`,
  );
  await actor(uid(1), 'aal2');
  await assert.rejects(() => query("select public.tilawa_admin_list('students')"), {
    code: '42501',
  });
  checks++;
  // Student account redesign: real profile data, optional preferences and bounded summaries.
  await actor(uid(3));
  const minimalProfile = {
    value: {
      name: 'Alex Reader',
      country: 'United Kingdom',
      zone: 'Europe/London',
      photo: '',
      birthDate: '',
      goal: '',
      schedule: '',
    },
  };
  const profileKey = crypto.randomUUID();
  await command(minimalProfile, profileKey, 'student');
  await command(minimalProfile, profileKey, 'student');
  const own = (await query('select public.tilawa_account_bootstrap() a'))[0].a;
  check(own.profile.display_name, 'Alex Reader', 'name and country alone save and replay');
  check(own.student.birth_date, null, 'optional birthday is null');
  check(own.student.learning_goal, '', 'optional goal stays empty');
  await assert.rejects(
    () =>
      command(
        { ...minimalProfile, value: { ...minimalProfile.value, name: 'Changed' } },
        profileKey,
        'student',
      ),
    /IDEMPOTENCY_CONFLICT/,
  );
  checks++;
  for (const invalid of [
    { name: '' },
    { country: '' },
    { zone: 'Missing/Zone' },
    { birthDate: '2099-01-01' },
    { birthDate: '2024-02-30' },
    { birthDate: 'not-a-date' },
    { goal: 42 },
  ]) {
    await assert.rejects(
      () =>
        command({ value: { ...minimalProfile.value, ...invalid } }, crypto.randomUUID(), 'student'),
      /INVALID_PROFILE/,
    );
    checks++;
  }
  await assert.rejects(
    () =>
      command(
        { value: { ...minimalProfile.value, photo: uid(4) + '/avatar.webp' } },
        crypto.randomUUID(),
        'student',
      ),
    /INVALID_PHOTO/,
  );
  checks++;
  const home = (await query("select public.tilawa_account_view('home') a"))[0].a;
  check(
    home.subscriptions[0].credits_summary,
    subscription.credits_summary,
    'home package balance matches full package view',
  );
  check(home.recentConversations.length, 1, 'home contains only participant conversations');
  check(
    home.recentConversations[0].preview,
    'Old conversation message',
    'home uses the latest visible message',
  );
  check(
    Object.hasOwn(home.recentConversations[0], 'student_id'),
    false,
    'home conversation projection omits private record fields',
  );
  check(own.unreadMessages, 0, 'own sent messages do not count as unread');
  await actor(uid(2));
  check(
    (await query('select public.tilawa_account_bootstrap() a'))[0].a.unreadMessages,
    221,
    'unread count includes history beyond paginated messages',
  );
  await command(
    { conversationId: uid(3002), operation: 'read' },
    crypto.randomUUID(),
    'conversation',
  );
  check(
    (await query('select public.tilawa_account_bootstrap() a'))[0].a.unreadMessages,
    1,
    'reading a conversation updates account badge',
  );
  await actor(uid(4));
  check(
    (await query("select public.tilawa_account_view('home') a"))[0].a.subscriptions.length,
    0,
    'home cannot expose another student package',
  );
  await actor(uid(3));
  await db.exec(
    `reset role;insert into public.direct_conversation_user_states(conversation_id,user_id,hidden_at) values('${uid(
      3001,
    )}','${uid(3)}',now());`,
  );
  await actor(uid(3));
  check(
    (await query("select public.tilawa_account_view('home') a"))[0].a.recentConversations.length,
    0,
    'hidden conversations are excluded from overview',
  );
  await db.exec('reset role');
  check(
    (
      await query(
        "select has_function_privilege('authenticated','private.tilawa_command_before_profile(text,jsonb,uuid)','execute') allowed",
      )
    )[0].allowed,
    false,
    'previous command helper is not directly executable',
  );
  check(
    (
      await query(
        "select has_function_privilege('anon','public.tilawa_account_bootstrap()','execute') allowed",
      )
    )[0].allowed,
    false,
    'anonymous users cannot read account badges',
  );
  console.log(`${checks} isolated backend checks passed`);
} finally {
  await db.close();
}
