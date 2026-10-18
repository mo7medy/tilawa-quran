-- Independent website project. No application users or Quran content are imported.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admin_memberships enable row level security;
create function private.tilawa_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.admin_memberships where user_id = (select auth.uid()));
$$;
revoke all on function private.tilawa_is_admin() from public;
grant execute on function private.tilawa_is_admin() to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  country text not null default '' check (length(country) <= 80),
  time_zone text not null default 'UTC',
  locale text not null default 'en' check (locale in ('en','ar')),
  avatar_path text,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date check (birth_date <= current_date),
  learning_goal text not null default '' check (length(learning_goal) <= 1500),
  preferred_schedule text not null default '' check (length(preferred_schedule) <= 200)
);
create table public.teacher_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,100}$'),
  display_name text not null default '' check (length(display_name) <= 100),
  country text not null default '',
  gender text not null default 'male' check (gender in ('male','female')),
  specialties text[] not null default '{}',
  teaching_languages text[] not null default '{}',
  biography jsonb not null default '{}',
  approach jsonb not null default '{}',
  introduction jsonb not null default '{}',
  display_name_localized jsonb not null default '{}',
  experience integer not null default 0 check (experience between 0 and 80),
  avatar_path text,
  video_url text check (video_url is null or video_url ~ '^https://'),
  approval text not null default 'incomplete' check (approval in ('incomplete','pending','approved','rejected')),
  academy_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.teacher_private_contacts (
  teacher_id uuid primary key references public.teacher_profiles(user_id) on delete cascade,
  phone text not null default '' check (length(phone) <= 30)
);
create table public.teacher_qualifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  description jsonb not null check (jsonb_typeof(description) = 'object')
);
create index teacher_qualifications_teacher_idx on public.teacher_qualifications(teacher_id);
create table public.teacher_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  path text not null unique,
  label text not null check (length(label) between 1 and 200),
  created_at timestamptz not null default now()
);
create index teacher_documents_teacher_idx on public.teacher_documents(teacher_id);
create table public.teacher_approval_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('pending','approved','rejected')),
  reason text not null default '' check (length(reason) <= 1500),
  created_at timestamptz not null default now()
);
create index teacher_approval_events_teacher_idx on public.teacher_approval_events(teacher_id, created_at desc);
create index teacher_approval_events_actor_idx on public.teacher_approval_events(actor_id);
create table public.platform_settings (
  id boolean primary key default true check(id),
  teacher_registration_enabled boolean not null default true,
  payments_enabled boolean not null default false check (not payments_enabled),
  meetings_enabled boolean not null default false check (not meetings_enabled)
);
insert into public.platform_settings default values;
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_logs_actor_idx on public.admin_audit_logs(actor_id, created_at desc);
create table public.academy_plans (
  id text primary key check(id in ('essential','progress','immersive')),
  lessons integer not null check(lessons > 0),
  price_cents integer not null check(price_cents > 0),
  duration_minutes integer not null default 45 check(duration_minutes = 45),
  gift_lessons integer not null default 0 check(gift_lessons between 0 and 1),
  validity_days integer not null default 30 check(validity_days = 30),
  grace_days integer not null default 5 check(grace_days = 5),
  currency text not null default 'USD' check(currency = 'USD'),
  active boolean not null default true
);
insert into public.academy_plans(id, lessons, price_cents, gift_lessons) values
 ('essential',8,8000,0),('progress',12,10000,1),('immersive',16,12000,1);
create table public.teacher_offers (
  teacher_id uuid primary key references public.teacher_profiles(user_id) on delete cascade,
  pricing text not null default 'both' check(pricing in ('perLesson','monthly','both')),
  price_cents integer check(price_cents > 0),
  duration_minutes integer not null default 45 check(duration_minutes between 15 and 120 and duration_minutes % 5 = 0),
  monthly_price_cents integer check(monthly_price_cents > 0),
  monthly_lessons integer not null default 8 check(monthly_lessons between 1 and 60),
  currency text not null default 'USD' check(currency = 'USD'),
  updated_at timestamptz not null default now()
);

create function private.tilawa_require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
 if caller is null or not exists(select 1 from public.profiles where id=caller and disabled_at is null) then
  raise exception using errcode='42501', message='AUTH_REQUIRED';
 end if;
 return caller;
end $$;
revoke all on function private.tilawa_require_user() from public;
grant execute on function private.tilawa_require_user() to authenticated;

create function private.tilawa_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),100));
 insert into public.student_profiles(user_id) values(new.id);
 return new;
end $$;
revoke all on function private.tilawa_new_user() from public, anon, authenticated;
create trigger tilawa_new_user after insert on auth.users for each row execute function private.tilawa_new_user();

-- Read access only. All sensitive writes use authenticated, validated command functions.
do $$ declare name text; begin
 foreach name in array array['profiles','student_profiles','teacher_profiles','teacher_private_contacts','teacher_qualifications','teacher_documents','teacher_approval_events','platform_settings','admin_audit_logs','academy_plans','teacher_offers'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from anon, authenticated',name);
  execute format('grant select on public.%I to authenticated',name);
 end loop;
end $$;
create policy profile_self on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.tilawa_is_admin()));
create policy student_self on public.student_profiles for select to authenticated using(user_id=(select auth.uid()) or (select private.tilawa_is_admin()));
grant select on public.teacher_profiles, public.teacher_qualifications, public.teacher_offers, public.academy_plans, public.platform_settings to anon;
create policy teacher_read on public.teacher_profiles for select to anon, authenticated using(approval='approved' or user_id=(select auth.uid()) or (select private.tilawa_is_admin()));
create policy contacts_read on public.teacher_private_contacts for select to authenticated using(teacher_id=(select auth.uid()) or (select private.tilawa_is_admin()));
create policy qualifications_read on public.teacher_qualifications for select to anon, authenticated using(exists(select 1 from public.teacher_profiles t where t.user_id=teacher_id));
create policy documents_read on public.teacher_documents for select to authenticated using(teacher_id=(select auth.uid()) or (select private.tilawa_is_admin()));
create policy approval_read on public.teacher_approval_events for select to authenticated using(teacher_id=(select auth.uid()) or (select private.tilawa_is_admin()));
create policy settings_read on public.platform_settings for select to anon, authenticated using(true);
create policy plans_read on public.academy_plans for select to anon, authenticated using(active);
create policy offers_read on public.teacher_offers for select to anon, authenticated using(exists(select 1 from public.teacher_profiles t where t.user_id=teacher_id));
create policy audit_read on public.admin_audit_logs for select to authenticated using((select private.tilawa_is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('tilawa-avatars','tilawa-avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('tilawa-teacher-documents','tilawa-teacher-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy tilawa_file_insert on storage.objects for insert to authenticated with check(
 bucket_id in ('tilawa-avatars','tilawa-teacher-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tilawa_file_update on storage.objects for update to authenticated using(
 bucket_id in ('tilawa-avatars','tilawa-teacher-documents') and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id in ('tilawa-avatars','tilawa-teacher-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tilawa_file_delete on storage.objects for delete to authenticated using(
 bucket_id in ('tilawa-avatars','tilawa-teacher-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tilawa_file_read on storage.objects for select to anon, authenticated using(
 (bucket_id in ('tilawa-avatars','tilawa-teacher-documents') and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.tilawa_is_admin())))
 or (bucket_id='tilawa-avatars' and exists(select 1 from public.teacher_profiles t where t.approval='approved' and t.avatar_path=name)));
commit;
