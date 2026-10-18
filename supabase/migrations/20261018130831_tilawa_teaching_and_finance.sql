begin;
create table public.teacher_availability (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
 weekday integer not null check(weekday between 0 and 6), start_time time not null, end_time time not null check(end_time > start_time),
 unique(teacher_id,weekday,start_time)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 teacher_id uuid references public.teacher_profiles(user_id), plan_id text references public.academy_plans(id),
 kind text not null check(kind in ('academy','teacher','lesson')), subject text not null check(subject in ('arabic','quran')),
 amount_cents integer not null check(amount_cents >= 0), currency text not null default 'USD' check(currency='USD'),
 terms jsonb not null, status text not null default 'pending' check(status in ('pending','paid','cancelled','expired','refunded')),
 created_at timestamptz not null default now()
);
create table public.payment_transactions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), provider_reference text unique,
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
 amount_cents integer not null check(amount_cents>=0), teacher_net_cents integer check(teacher_net_cents>=0 and teacher_net_cents<=amount_cents),
 currency text not null default 'USD' check(currency='USD'), created_at timestamptz not null default now()
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), payment_id uuid references public.payment_transactions(id),
 event_key text not null unique, payload jsonb not null, created_at timestamptz not null default now()
);
create table public.student_subscriptions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('academy','teacher')), teacher_id uuid references public.teacher_profiles(user_id),
 plan_id text references public.academy_plans(id), payment_id uuid not null unique references public.payment_transactions(id),
 subject text not null check(subject in ('arabic','quran')), included_lessons integer not null check(included_lessons>0),
 duration_minutes integer not null check(duration_minutes>0), price_cents integer not null check(price_cents>0),
 gift_lessons integer not null default 0 check(gift_lessons between 0 and 1), gift_type text check(gift_type in ('recitation','memorization')),
 starts_at timestamptz not null, ends_at timestamptz not null, access_ends_at timestamptz not null,
 status text not null default 'active' check(status in ('active','expired','cancelled')),
 check(ends_at=starts_at+interval '30 days' and access_ends_at=ends_at+interval '5 days'),
 check((kind='academy' and plan_id is not null and teacher_id is null and duration_minutes=45) or (kind='teacher' and teacher_id is not null and plan_id is null and gift_lessons=0))
);
create table public.booking_requests (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 teacher_id uuid not null references public.teacher_profiles(user_id),
 subject text not null check(subject in ('arabic','quran')), lesson_type text not null check(lesson_type in ('intro','follow_up','intensive_review')),
 funding_source text not null check(funding_source in ('free_intro','academy_credit','teacher_subscription','direct_payment')),
 subscription_id uuid references public.student_subscriptions(id), credit_bucket text check(credit_bucket in ('regular','gift')),
 scheduled_at timestamptz not null, duration_minutes integer not null check(duration_minutes between 1 and 120),
 amount_cents integer not null check(amount_cents>=0), currency text not null default 'USD' check(currency='USD'),
 payment_id uuid references public.payment_transactions(id), payment_status text not null check(payment_status in ('not_required','covered','unpaid','paid','refund_pending','refunded')),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled','expired')),
 note text not null default '' check(length(note)<=500), slot_hold_expires_at timestamptz,
 created_at timestamptz not null default now(), check(student_id<>teacher_id)
);
create table public.lessons (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.booking_requests(id),
 student_id uuid not null references public.profiles(id), teacher_id uuid not null references public.teacher_profiles(user_id),
 subject text not null check(subject in ('arabic','quran')), lesson_type text not null check(lesson_type in ('intro','follow_up','intensive_review')),
 funding_source text not null, subscription_id uuid references public.student_subscriptions(id),
 scheduled_at timestamptz not null, duration_minutes integer not null check(duration_minutes>0),
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled')),
 payment_status text not null, meeting_url text check(meeting_url is null or meeting_url ~ '^https://'),
 completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.subscription_credit_ledger (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.student_subscriptions(id),
 booking_id uuid references public.booking_requests(id), bucket text not null check(bucket in ('regular','gift')),
 operation text not null check(operation in ('grant','reserve','consume','release','expire')), delta integer not null,
 event_key text not null unique, created_at timestamptz not null default now(),
 check((operation='grant' and delta>0) or (operation='reserve' and delta=-1) or (operation='consume' and delta=0) or (operation='release' and delta=1) or (operation='expire' and delta<0))
);
create table public.lesson_completion_requests (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 note text not null default '' check(length(note)<=1500), created_at timestamptz not null default now(), responded_at timestamptz
);
create unique index lesson_completion_pending_idx on public.lesson_completion_requests(lesson_id) where status='pending';
create table public.lesson_cancellation_requests (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id), requester_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 financial_status text not null default 'not_required' check(financial_status in ('not_required','credit_restored','review_pending','refunded','failed')),
 note text not null default '' check(length(note)<=1500), created_at timestamptz not null default now(), responded_at timestamptz
);
create unique index lesson_cancellation_pending_idx on public.lesson_cancellation_requests(lesson_id) where status='pending';
create table public.lesson_events (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id), actor_id uuid references public.profiles(id),
 action text not null, data jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null unique references public.lessons(id),
 student_id uuid not null references public.profiles(id), teacher_id uuid not null references public.teacher_profiles(user_id),
 rating integer not null check(rating between 1 and 5), body text not null check(length(body) between 1 and 2000),
 visible boolean not null default true, created_at timestamptz not null default now()
);
create table public.teacher_discount_coupons (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teacher_profiles(user_id),
 code text not null check(code ~ '^[A-Z0-9_-]{3,24}$'), percent integer not null check(percent between 1 and 90),
 usage_limit integer not null check(usage_limit>0), active boolean not null default true, expires_at timestamptz,
 unique(teacher_id,code)
);
create table public.coupon_redemptions (
 id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.teacher_discount_coupons(id),
 payment_id uuid not null unique references public.payment_transactions(id), created_at timestamptz not null default now()
);
create table public.earnings_transactions (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teacher_profiles(user_id),
 lesson_id uuid references public.lessons(id), subscription_id uuid references public.student_subscriptions(id),
 payment_id uuid not null references public.payment_transactions(id), amount_cents integer not null check(amount_cents>0),
 status text not null check(status in ('pending','available','reversed')), event_key text not null unique,
 created_at timestamptz not null default now(), check(num_nonnulls(lesson_id,subscription_id)=1)
);
create table public.withdrawal_requests (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teacher_profiles(user_id),
 amount_cents integer not null check(amount_cents>0), method text not null check(method='bank'),
 status text not null default 'pending' check(status in ('pending','approved','paid','rejected')),
 created_at timestamptz not null default now()
);

-- Every foreign key participates in a lookup, authorization predicate or cleanup.
do $$ declare c record; begin
 for c in select t.relname,a.attname from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=k.conkey[1] where k.contype='f' and n.nspname='public' loop
  execute format('create index if not exists %I on public.%I(%I)',c.relname||'_'||c.attname||'_fk_idx',c.relname,c.attname);
 end loop;
end $$;
create index booking_teacher_schedule_idx on public.booking_requests(teacher_id,scheduled_at) where status in ('pending','accepted');
create index booking_student_schedule_idx on public.booking_requests(student_id,scheduled_at) where status in ('pending','accepted');
create index lessons_teacher_schedule_idx on public.lessons(teacher_id,scheduled_at) where status='scheduled';
create index lessons_student_schedule_idx on public.lessons(student_id,scheduled_at) where status='scheduled';

create function private.tilawa_related_student(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.booking_requests b where b.student_id=p_student and b.teacher_id=(select auth.uid()))
 or exists(select 1 from public.lessons l where l.student_id=p_student and l.teacher_id=(select auth.uid()));
$$;
revoke all on function private.tilawa_related_student(uuid) from public;
grant execute on function private.tilawa_related_student(uuid) to authenticated;
-- Private DOB and contact details remain self-only. A separate projection is returned for related students.
create function private.tilawa_lesson_participant(p_lesson uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lessons l where l.id=p_lesson and (select auth.uid()) in (l.student_id,l.teacher_id));
$$;
revoke all on function private.tilawa_lesson_participant(uuid) from public;
grant execute on function private.tilawa_lesson_participant(uuid) to authenticated;

do $$ declare name text; begin
 foreach name in array array['teacher_availability','orders','payment_transactions','payment_events','student_subscriptions','booking_requests','lessons','subscription_credit_ledger','lesson_completion_requests','lesson_cancellation_requests','lesson_events','reviews','teacher_discount_coupons','coupon_redemptions','earnings_transactions','withdrawal_requests'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from anon, authenticated',name);
  if name<>'payment_events' then execute format('grant select on public.%I to authenticated',name); end if;
 end loop;
end $$;
create policy availability_read on public.teacher_availability for select to authenticated using(exists(select 1 from public.teacher_profiles t where t.user_id=teacher_id));
create policy orders_read on public.orders for select to authenticated using(student_id=(select auth.uid()));
create policy payments_read on public.payment_transactions for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.student_id=(select auth.uid())));
create policy subscriptions_read on public.student_subscriptions for select to authenticated using(student_id=(select auth.uid()) or teacher_id=(select auth.uid()));
create policy booking_read on public.booking_requests for select to authenticated using((select auth.uid()) in (student_id,teacher_id) and (teacher_id<>(select auth.uid()) or payment_status<>'unpaid'));
create policy lesson_read on public.lessons for select to authenticated using((select auth.uid()) in (student_id,teacher_id));
create policy credits_read on public.subscription_credit_ledger for select to authenticated using(exists(select 1 from public.student_subscriptions s where s.id=subscription_id and s.student_id=(select auth.uid())));
create policy completion_read on public.lesson_completion_requests for select to authenticated using(private.tilawa_lesson_participant(lesson_id));
create policy cancellation_read on public.lesson_cancellation_requests for select to authenticated using(private.tilawa_lesson_participant(lesson_id));
create policy events_read on public.lesson_events for select to authenticated using(private.tilawa_lesson_participant(lesson_id));
grant select on public.reviews to anon;
create policy reviews_read on public.reviews for select to anon, authenticated using((visible and exists(select 1 from public.teacher_profiles t where t.user_id=teacher_id and t.approval='approved')) or (select auth.uid()) in (student_id,teacher_id));
create policy coupons_read on public.teacher_discount_coupons for select to authenticated using(teacher_id=(select auth.uid()));
create policy redemptions_read on public.coupon_redemptions for select to authenticated using(exists(select 1 from public.teacher_discount_coupons c where c.id=coupon_id and c.teacher_id=(select auth.uid())));
create policy earnings_read on public.earnings_transactions for select to authenticated using(teacher_id=(select auth.uid()));
create policy withdrawals_read on public.withdrawal_requests for select to authenticated using(teacher_id=(select auth.uid()));

create function private.tilawa_schedule_lock(p_teacher uuid,p_student uuid) returns void language plpgsql set search_path='' as $$
declare person uuid;
begin
 for person in select distinct x from unnest(array[p_teacher,p_student]) x order by x loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tilawa-schedule:'||person::text,0));
 end loop;
end $$;
revoke all on function private.tilawa_schedule_lock(uuid,uuid) from public,anon,authenticated;
create function private.tilawa_assert_slot(p_teacher uuid,p_student uuid,p_at timestamptz,p_minutes integer,p_exclude uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare zone text; local_at timestamp;
begin
 perform private.tilawa_schedule_lock(p_teacher,p_student);
 if p_minutes not between 1 and 120 or p_at<>date_trunc('minute',p_at) or p_at<now()+interval '1 hour' or p_at>now()+interval '45 days' then
  raise exception using errcode='22023',message='INVALID_BOOKING_TIME';
 end if;
 select p.time_zone into zone from public.profiles p join public.teacher_profiles t on t.user_id=p.id where p.id=p_teacher and t.approval='approved' and p.disabled_at is null;
 if zone is null then raise exception using errcode='42501',message='TEACHER_NOT_APPROVED'; end if;
 local_at:=p_at at time zone zone;
 if not exists(select 1 from public.teacher_availability a where a.teacher_id=p_teacher and a.weekday=extract(dow from local_at)::int and a.start_time=local_at::time) then
  raise exception using errcode='22023',message='OUTSIDE_AVAILABILITY';
 end if;
 if exists(select 1 from public.booking_requests b where b.id is distinct from p_exclude and (b.teacher_id=p_teacher or b.student_id=p_student)
  and b.status in ('pending','accepted') and (b.payment_status<>'unpaid' or b.slot_hold_expires_at>now())
  and b.scheduled_at<p_at+make_interval(mins=>p_minutes) and b.scheduled_at+make_interval(mins=>b.duration_minutes)>p_at)
 or exists(select 1 from public.lessons l where l.booking_id is distinct from p_exclude and (l.teacher_id=p_teacher or l.student_id=p_student)
  and l.status='scheduled' and l.scheduled_at<p_at+make_interval(mins=>p_minutes) and l.scheduled_at+make_interval(mins=>l.duration_minutes)>p_at) then
  raise exception using errcode='23P01',message='BOOKING_SLOT_UNAVAILABLE';
 end if;
end $$;
revoke all on function private.tilawa_assert_slot(uuid,uuid,timestamptz,integer,uuid) from public,anon,authenticated;

create function private.tilawa_release_credit(p_booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.booking_requests%rowtype;
begin
 select * into b from public.booking_requests where id=p_booking;
 if b.subscription_id is not null and exists(select 1 from public.subscription_credit_ledger where booking_id=b.id and operation='reserve') then
  perform 1 from public.student_subscriptions where id=b.subscription_id for update;
  insert into public.subscription_credit_ledger(subscription_id,booking_id,bucket,operation,delta,event_key)
  select b.subscription_id,b.id,b.credit_bucket,'release',1,'release:'||b.id where not exists(select 1 from public.subscription_credit_ledger where booking_id=b.id and operation='consume')
  on conflict(event_key) do nothing;
 end if;
end $$;
revoke all on function private.tilawa_release_credit(uuid) from public,anon,authenticated;
commit;
