// Local-only SQL verification. Reuses the installed PGlite verification runtime; no network or live writes.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const runtime =
  process.env.PGLITE_MODULE ??
  '../../.local-runtime/verification-node-modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(runtime);
const db = new PGlite();
let checks = 0;
const check = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks++;
  console.log(`PASS ${label}`);
};
try {
  await db.exec(`
set timezone='UTC';create role anon;create role authenticated;create schema auth;create schema private;
grant usage on schema public,auth,private to anon,authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,display_name text,disabled_at timestamptz,created_at timestamptz default now());
create table private.admin_memberships(user_id uuid);
create function private.tilawa_is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.admin_memberships where user_id=auth.uid())$$;
create function private.tilawa_require_user() returns uuid language plpgsql stable security definer set search_path='' as $$declare caller uuid:=auth.uid();begin if caller is null or not exists(select 1 from public.profiles where id=caller and disabled_at is null) then raise exception using errcode='42501',message='AUTH_REQUIRED';end if;return caller;end$$;
create table public.student_profiles(user_id uuid);
create table public.teacher_profiles(user_id uuid,display_name text,approval text);
create table public.lessons(id uuid,scheduled_at timestamptz,status text);
create table public.academy_plans(id text,lessons integer);
create table public.student_subscriptions(id uuid,kind text,subject text,plan_id text,status text,starts_at timestamptz,ends_at timestamptz);
create table public.platform_settings(id boolean,payments_enabled boolean);
create table public.orders(id uuid primary key,student_id uuid,teacher_id uuid,kind text,subject text,amount_cents integer,status text,created_at timestamptz);
create table public.payment_transactions(id uuid primary key,order_id uuid,status text,amount_cents integer,currency text,created_at timestamptz);
create table public.earnings_transactions(teacher_id uuid,amount_cents integer,status text);
create table public.withdrawal_requests(id uuid,teacher_id uuid,amount_cents integer,status text,created_at timestamptz);
`);
  const migration = readdirSync('supabase/migrations').find((f) =>
    f.endsWith('_tilawa_admin_reports.sql'),
  );
  await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'));
  const uid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  await db.exec(`insert into public.profiles(id,display_name,created_at) values('${uid(
    1,
  )}','Student','2026-02-01'),('${uid(2)}','Teacher','2026-02-02'),('${uid(
    3,
  )}','Admin','2026-02-03'),('${uid(4)}','Other teacher','2026-01-31');
insert into private.admin_memberships values('${uid(
    3,
  )}');insert into public.student_profiles values('${uid(1)}');
insert into public.teacher_profiles values('${uid(2)}','Teacher','approved'),('${uid(
    4,
  )}','Other teacher','pending');
insert into public.platform_settings values(true,false);insert into public.academy_plans values('essential',8),('progress',12),('immersive',16);
insert into public.student_subscriptions values(gen_random_uuid(),'academy','arabic','essential','active',now()-interval '2 days',now()+interval '3 days'),(gen_random_uuid(),'teacher','quran',null,'active',now()-interval '2 days',now()+interval '20 days'),(gen_random_uuid(),'academy','quran','progress','active',now()-interval '40 days',now()-interval '10 days');
insert into public.lessons values(gen_random_uuid(),'2026-02-01','completed'),(gen_random_uuid(),'2026-02-02','cancelled'),(gen_random_uuid(),now(),'scheduled'),(gen_random_uuid(),'2026-03-01','completed');
insert into public.earnings_transactions values('${uid(2)}',10000,'available'),('${uid(
    2,
  )}',2000,'pending'),('${uid(4)}',100,'available');
insert into public.withdrawal_requests values(gen_random_uuid(),'${uid(
    2,
  )}',3000,'pending',now()),(gen_random_uuid(),'${uid(
    2,
  )}',1000,'paid',now()),(gen_random_uuid(),'${uid(
    2,
  )}',500,'approved',now()),(gen_random_uuid(),'${uid(
    2,
  )}',9000,'rejected',now()),(gen_random_uuid(),'${uid(4)}',200,'pending',now());`);
  for (const [index, kind, status, amount, date] of [
    [1, 'academy', 'paid', 8000, '2026-02-01'],
    [2, 'teacher', 'paid', 12000, '2026-02-02'],
    [3, 'lesson', 'pending', 3000, '2026-02-03'],
    [4, 'academy', 'refunded', 10000, '2026-02-04'],
    [5, 'teacher', 'failed', 5000, '2026-02-05'],
    [6, 'academy', 'paid', 7000, '2026-03-01'],
  ]) {
    await db.query('insert into public.orders values($1,$2,$3,$4,$5,$6,$7,$8)', [
      uid(100 + index),
      uid(1),
      uid(2),
      kind,
      'arabic',
      amount,
      status,
      date,
    ]);
    await db.query('insert into public.payment_transactions values($1,$2,$3,$4,$5,$6)', [
      uid(200 + index),
      uid(100 + index),
      status,
      amount,
      'USD',
      date,
    ]);
  }
  await db.exec("set timezone='America/New_York'");
  const sql = "select public.tilawa_admin_finance('2026-02-01','2026-03-01') as report";
  await db.exec('set role anon');
  await assert.rejects(() => db.query(sql), { code: '42501' });
  checks++;
  await db.exec(`reset role;set request.jwt.claim.sub='${uid(1)}';set role authenticated`);
  await assert.rejects(() => db.query(sql), { code: '42501' });
  checks++;
  await db.exec(`reset role;set request.jwt.claim.sub='${uid(3)}';set role authenticated`);
  const report = (await db.query(sql)).rows[0].report;
  const empty = (
    await db.query("select public.tilawa_admin_finance('2099-02-01','2099-03-01') as report")
  ).rows[0].report;
  check(empty.paidCents, 0, 'empty period has zero paid records rather than an unavailable report');
  check(empty.total, 0, 'empty period row count');
  check(report.paidCents, 20000, 'paid totals exclude pending, failed, refunded and end boundary');
  check(report.pendingCents, 3000, 'pending amounts separate');
  check(report.refundedCents, 10000, 'refunded amounts separate');
  check(report.failedCents, 5000, 'failed amounts separate');
  check(report.total, 5, 'filtered row count');
  check(
    report.availableEarningsCents,
    5500,
    'subtract reserved and paid withdrawals per teacher, clamp individually',
  );
  check(report.pendingEarningsCents, 2000, 'pending earnings');
  check(report.platformShareCents, null, 'no invented platform commission');
  check(report.paymentsEnabled, false, 'gateway remains disabled');
  check(
    report.sources.find((s) => s.kind === 'teacher').paidCents,
    12000,
    'separate teacher revenue',
  );
  const filtered = (
    await db.query(
      "select public.tilawa_admin_finance('2026-02-01','2026-03-01','paid','teacher',1,false) as report",
    )
  ).rows[0].report;
  check(filtered.total, 1, 'status and source filtering');
  check(filtered.paidCents, 20000, 'filters do not silently alter period summary');
  const page2 = (
    await db.query(
      "select public.tilawa_admin_finance('2026-02-01','2026-03-01','all','all',2,false) as report",
    )
  ).rows[0].report;
  check(page2.payments.length, 0, 'pagination does not repeat first page');
  const overview = (
    await db.query("select public.tilawa_admin_overview('2026-02-01','2026-03-01') as report")
  ).rows[0].report;
  check(overview.newAccounts, 3, 'registrations use inclusive start/exclusive end');
  check(overview.completedLessons, 1, 'completed lessons by schedule');
  check(overview.cancelledLessons, 1, 'cancelled lessons by schedule');
  check(overview.activeSubscriptions, 2, 'expired status lag excluded');
  check(overview.endingSoon, 1, 'ending soon');
  check(overview.trend.length, 28, 'daily UTC buckets including empty days');
  check(overview.subjects, { arabic: 1, quran: 1 }, 'subject distribution');
  for (const query of [
    "select public.tilawa_admin_overview('2026-02-01','2026-02-01')",
    "select public.tilawa_admin_finance('2026-02-01','2026-03-01','oops')",
    "select public.tilawa_admin_finance('2026-02-01','2026-03-01','all','all',0)",
    "select public.tilawa_admin_overview('2024-01-01','2026-03-01')",
  ]) {
    await assert.rejects(() => db.query(query), { code: '22023' });
    checks++;
  }
  await db.exec('reset role');
  await db.exec(
    `insert into public.payment_transactions select gen_random_uuid(),'${uid(
      101,
    )}','paid',100,'USD','2026-02-10'::timestamptz from generate_series(1,5000);set role authenticated;`,
  );
  await assert.rejects(
    () =>
      db.query("select public.tilawa_admin_finance('2026-02-01','2026-03-01','all','all',1,true)"),
    /EXPORT_TOO_LARGE/,
  );
  checks++;
  const exportFiltered = (
    await db.query(
      "select public.tilawa_admin_finance('2026-02-01','2026-03-01','paid','teacher',1,true) as report",
    )
  ).rows[0].report;
  check(exportFiltered.payments.length, 1, 'export respects record filters');
  console.log(`PASS ${checks} local SQL reporting and access checks`);
} finally {
  await db.close();
}
