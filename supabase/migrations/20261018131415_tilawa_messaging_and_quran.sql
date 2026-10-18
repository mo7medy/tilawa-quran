begin;
create table public.direct_conversations (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teacher_profiles(user_id),
 student_id uuid not null references public.profiles(id), requested_by uuid not null references public.profiles(id),
 request_status text not null default 'pending' check(request_status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(), unique(teacher_id,student_id), check(teacher_id<>student_id)
);
create table public.direct_messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id), body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(), retracted_at timestamptz
);
create index direct_messages_page_idx on public.direct_messages(conversation_id,created_at desc,id);
create table public.direct_conversation_user_states (
 conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id), blocked boolean not null default false, last_read_at timestamptz,
 hidden_at timestamptz, primary key(conversation_id,user_id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 event_key text not null unique, kind text not null, payload jsonb not null default '{}', path text not null,
 created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_page_idx on public.notifications(user_id,created_at desc,id);
create table public.quran_bookmarks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 mushaf_id integer not null default 1 check(mushaf_id>0), type text not null check(type in ('ayah','page','surah','juz')),
 key integer not null check(key>0), verse_number integer, is_reading boolean not null default false,
 created_at timestamptz not null default now(), unique nulls not distinct(user_id,mushaf_id,type,key,verse_number,is_reading)
);
create unique index quran_reading_bookmark_idx on public.quran_bookmarks(user_id,mushaf_id) where is_reading;
create table public.quran_collections (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), is_default boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index quran_default_collection_idx on public.quran_collections(user_id) where is_default;
create table public.quran_collection_bookmarks (
 collection_id uuid not null references public.quran_collections(id) on delete cascade,
 bookmark_id uuid not null references public.quran_bookmarks(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(collection_id,bookmark_id)
);
create table public.quran_notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default '' check(length(title)<=200), body text not null check(length(body) between 1 and 20000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.quran_note_ranges (
 note_id uuid not null references public.quran_notes(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
 range text not null check(range ~ '^[0-9]+:[0-9]+(-[0-9]+:[0-9]+)?$'), primary key(note_id,range)
);
create table public.quran_pinned_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null default 'ayah' check(target_type='ayah'), target_id text not null check(target_id ~ '^[0-9]+:[0-9]+$'),
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(user_id,target_type,target_id)
);
create table public.quran_preferences (
 user_id uuid not null references public.profiles(id) on delete cascade, mushaf_id integer not null default 0,
 preference_group text not null check(length(preference_group) between 1 and 80), value jsonb not null check(jsonb_typeof(value)='object'),
 updated_at timestamptz not null default now(), primary key(user_id,mushaf_id,preference_group)
);
create table public.quran_reading_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 chapter_number integer not null check(chapter_number between 1 and 114), verse_number integer not null check(verse_number>0),
 updated_at timestamptz not null default now(), unique(user_id,chapter_number,verse_number)
);
create table public.quran_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 category text not null default 'QURAN', mushaf_id integer not null default 1,
 type text not null check(type in ('QURAN_TIME','QURAN_PAGES','QURAN_RANGE')), target_amount text not null,
 duration integer check(duration>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,category)
);
create table public.quran_activity_days (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 date date not null, mushaf_id integer not null default 1, seconds_read integer not null default 0 check(seconds_read>=0),
 pages_read integer not null default 0 check(pages_read>=0), ranges text[] not null default '{}', unique(user_id,date,mushaf_id)
);
create table public.quran_sync_imports (
 user_id uuid not null references public.profiles(id) on delete cascade, import_key text not null,
 imported_at timestamptz not null default now(), primary key(user_id,import_key)
);
create table private.action_receipts (
 user_id uuid not null references public.profiles(id) on delete cascade, request_key uuid not null,
 action text not null, payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(user_id,request_key)
);
alter table private.action_receipts enable row level security;

create function private.tilawa_conversation_participant(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.direct_conversations c where c.id=p_id and (select auth.uid()) in (c.teacher_id,c.student_id));
$$;
revoke all on function private.tilawa_conversation_participant(uuid) from public;
grant execute on function private.tilawa_conversation_participant(uuid) to authenticated;
do $$ declare name text; c record; begin
 foreach name in array array['direct_conversations','direct_messages','direct_conversation_user_states','notifications','quran_bookmarks','quran_collections','quran_collection_bookmarks','quran_notes','quran_note_ranges','quran_pinned_items','quran_preferences','quran_reading_sessions','quran_goals','quran_activity_days','quran_sync_imports'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from anon, authenticated',name);
  execute format('grant select on public.%I to authenticated',name);
  if name like 'quran_%' or name='notifications' then
   execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',name);
  end if;
 end loop;
 for c in select t.relname,a.attname from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=k.conkey[1] where k.contype='f' and n.nspname='public' loop
  execute format('create index if not exists %I on public.%I(%I)',c.relname||'_'||c.attname||'_fk_idx',c.relname,c.attname);
 end loop;
end $$;
create policy conversations_read on public.direct_conversations for select to authenticated using((select auth.uid()) in (teacher_id,student_id));
create policy messages_read on public.direct_messages for select to authenticated using(private.tilawa_conversation_participant(conversation_id));
create policy conversation_states_read on public.direct_conversation_user_states for select to authenticated using(user_id=(select auth.uid()) and private.tilawa_conversation_participant(conversation_id));

create function private.tilawa_notify(p_user uuid,p_key text,p_kind text,p_path text,p_payload jsonb default '{}') returns void
language sql security definer set search_path='' as $$
 insert into public.notifications(user_id,event_key,kind,path,payload) values(p_user,p_key||':'||p_user::text,p_kind,p_path,p_payload) on conflict(event_key) do nothing;
$$;
revoke all on function private.tilawa_notify(uuid,text,text,text,jsonb) from public,anon,authenticated;

-- Only participant-scoped rows are delivered. Storage and finance are never published.
alter publication supabase_realtime add table public.direct_conversations, public.direct_messages, public.notifications, public.booking_requests, public.lessons;
commit;
