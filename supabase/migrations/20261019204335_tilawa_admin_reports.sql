-- Read-only administrative reporting for the independent website.
begin;
create index if not exists profiles_created_reporting_idx on public.profiles(created_at);
create index if not exists payments_created_reporting_idx on public.payment_transactions(created_at, id);
create index if not exists orders_created_reporting_idx on public.orders(created_at);
create index if not exists lessons_scheduled_reporting_idx on public.lessons(scheduled_at);
create index if not exists subscriptions_ending_reporting_idx on public.student_subscriptions(ends_at) where status='active';

create function private.tilawa_admin_overview(p_from date, p_until date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; at_time timestamptz:=now(); start_at timestamptz; end_at timestamptz;
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>366 then
  raise exception using errcode='22023',message='INVALID_REPORT_RANGE';
 end if;
 start_at:=p_from::timestamp at time zone 'UTC'; end_at:=p_until::timestamp at time zone 'UTC';
 with active_subs as materialized (
  select s.* from public.student_subscriptions s where s.status='active' and s.starts_at<=at_time and s.ends_at>at_time
 ), daily as (
  select d::date as day from generate_series(p_from::timestamp,(p_until-1)::timestamp,interval '1 day') d
 ), registrations as (
  select (p.created_at at time zone 'UTC')::date as day,count(*) as amount from public.profiles p
  where p.created_at>=start_at and p.created_at<end_at group by 1
 ), lessons_by_day as (
  select (l.scheduled_at at time zone 'UTC')::date as day,count(*) as amount from public.lessons l
  where l.scheduled_at>=start_at and l.scheduled_at<end_at group by 1
 )
 select jsonb_build_object(
  'asOf',at_time,'timeZone','UTC',
  'students',(select count(*) from public.student_profiles s join public.profiles p on p.id=s.user_id where p.disabled_at is null),
  'approvedTeachers',(select count(*) from public.teacher_profiles t join public.profiles p on p.id=t.user_id where t.approval='approved' and p.disabled_at is null),
  'pendingTeachers',(select count(*) from public.teacher_profiles where approval='pending'),
  'lessonsToday',(select count(*) from public.lessons where status='scheduled' and scheduled_at>=date_trunc('day',at_time at time zone 'UTC') at time zone 'UTC' and scheduled_at<(date_trunc('day',at_time at time zone 'UTC')+interval '1 day') at time zone 'UTC'),
  'completedLessons',(select count(*) from public.lessons where status='completed' and scheduled_at>=start_at and scheduled_at<end_at),
  'cancelledLessons',(select count(*) from public.lessons where status='cancelled' and scheduled_at>=start_at and scheduled_at<end_at),
  'activeSubscriptions',(select count(*) from active_subs),
  'endingSoon',(select count(*) from active_subs where ends_at<at_time+interval '7 days'),
  'pendingPayments',(select count(*) from public.payment_transactions where status='pending'),
  'newAccounts',(select count(*) from public.profiles where created_at>=start_at and created_at<end_at),
  'trend',(select coalesce(jsonb_agg(jsonb_build_object('day',d.day,'accounts',coalesce(r.amount,0),'lessons',coalesce(l.amount,0)) order by d.day),'[]') from daily d left join registrations r using(day) left join lessons_by_day l using(day)),
  'subjects',(select jsonb_build_object('arabic',count(*) filter(where subject='arabic'),'quran',count(*) filter(where subject='quran')) from active_subs),
  'plans',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'lessons',a.lessons,'count',(select count(*) from active_subs s where s.kind='academy' and s.plan_id=a.id)) order by a.lessons),'[]') from public.academy_plans a),
  'teacherSubscriptions',(select count(*) from active_subs where kind='teacher')
 ) into result;
 return result;
end $$;
revoke all on function private.tilawa_admin_overview(date,date) from public,anon;
grant execute on function private.tilawa_admin_overview(date,date) to authenticated;
create function public.tilawa_admin_overview(p_from date,p_until date) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_overview(p_from,p_until) $$;
revoke all on function public.tilawa_admin_overview(date,date) from public,anon;
grant execute on function public.tilawa_admin_overview(date,date) to authenticated;

create function private.tilawa_admin_finance(p_from date,p_until date,p_status text default 'all',p_kind text default 'all',p_page integer default 1,p_export boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; start_at timestamptz; end_at timestamptz; records_count bigint; record_limit integer;
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>366
 or p_status is null or p_status not in ('all','paid','pending','failed','refunded')
 or p_kind is null or p_kind not in ('all','academy','teacher','lesson')
 or p_page is null or p_page<1 or p_page>100000 or p_export is null then
  raise exception using errcode='22023',message='INVALID_REPORT_RANGE';
 end if;
 start_at:=p_from::timestamp at time zone 'UTC'; end_at:=p_until::timestamp at time zone 'UTC';
 select count(*) into records_count from public.payment_transactions p join public.orders o on o.id=p.order_id
 where p.created_at>=start_at and p.created_at<end_at and (p_status='all' or p.status=p_status) and (p_kind='all' or o.kind=p_kind);
 if p_export and records_count>5000 then raise exception using errcode='22023',message='EXPORT_TOO_LARGE'; end if;
 record_limit:=case when p_export then 5000 else 25 end;
 with period_payments as materialized (
  select p.*,o.kind,o.subject,o.student_id,o.teacher_id from public.payment_transactions p join public.orders o on o.id=p.order_id
  where p.created_at>=start_at and p.created_at<end_at
 ), available_by_teacher as (
  select teacher_id,sum(amount_cents) as amount from public.earnings_transactions where status='available' group by teacher_id
 ), reserved_by_teacher as (
  select teacher_id,sum(amount_cents) as amount from public.withdrawal_requests where status in ('pending','approved','paid') group by teacher_id
 ), paged as (
  select p.id,p.created_at,p.status,p.kind,p.subject,p.amount_cents,p.currency,s.display_name as student,t.display_name as teacher
  from period_payments p left join public.profiles s on s.id=p.student_id left join public.teacher_profiles t on t.user_id=p.teacher_id
  where (p_status='all' or p.status=p_status) and (p_kind='all' or p.kind=p_kind)
  order by p.created_at desc,p.id desc limit record_limit offset (case when p_export then 0 else (p_page-1)*25 end)
 )
 select jsonb_build_object(
  'asOf',now(),'currency','USD','paymentsEnabled',(select payments_enabled from public.platform_settings where id),
  'paidCents',coalesce((select sum(amount_cents) from period_payments where status='paid'),0),
  'pendingCents',coalesce((select sum(amount_cents) from period_payments where status='pending'),0),
  'failedCents',coalesce((select sum(amount_cents) from period_payments where status='failed'),0),
  'refundedCents',coalesce((select sum(amount_cents) from period_payments where status='refunded'),0),
  'pendingOrdersCents',coalesce((select sum(amount_cents) from public.orders where status='pending' and created_at>=start_at and created_at<end_at),0),
  'sources',(select coalesce(jsonb_agg(jsonb_build_object('kind',k.kind,'paidCents',coalesce((select sum(amount_cents) from period_payments p where p.kind=k.kind and p.status='paid'),0))),'[]') from (values('academy'),('teacher'),('lesson')) k(kind)),
  'pendingEarningsCents',coalesce((select sum(amount_cents) from public.earnings_transactions where status='pending'),0),
  'availableEarningsCents',coalesce((select sum(greatest(a.amount-coalesce(r.amount,0),0)) from available_by_teacher a left join reserved_by_teacher r using(teacher_id)),0),
  'pendingWithdrawalsCents',coalesce((select sum(amount_cents) from public.withdrawal_requests where status='pending'),0),
  'approvedWithdrawalsCents',coalesce((select sum(amount_cents) from public.withdrawal_requests where status='approved'),0),
  'paidWithdrawalsCents',coalesce((select sum(amount_cents) from public.withdrawal_requests where status='paid'),0),
  'platformShareCents',null,
  'payments',(select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc),'[]') from paged p),
  'total',records_count,'page',p_page,'pageSize',25,
  'withdrawals',(select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc,w.id desc),'[]') from (
    select w.id,w.created_at,w.amount_cents,w.status,t.display_name as teacher from public.withdrawal_requests w
    left join public.teacher_profiles t on t.user_id=w.teacher_id order by w.created_at desc,w.id desc limit 25
   ) w)
 ) into result;
 return result;
end $$;
revoke all on function private.tilawa_admin_finance(date,date,text,text,integer,boolean) from public,anon;
grant execute on function private.tilawa_admin_finance(date,date,text,text,integer,boolean) to authenticated;
create function public.tilawa_admin_finance(p_from date,p_until date,p_status text default 'all',p_kind text default 'all',p_page integer default 1,p_export boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_finance(p_from,p_until,p_status,p_kind,p_page,p_export) $$;
revoke all on function public.tilawa_admin_finance(date,date,text,text,integer,boolean) from public,anon;
grant execute on function public.tilawa_admin_finance(date,date,text,text,integer,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
