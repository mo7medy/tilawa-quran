begin;
create function private.tilawa_valid_verse(p_key text) returns boolean language plpgsql immutable set search_path='' as $$
declare c int; v int; counts int[]:=array[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
begin
 if p_key is null or p_key !~ '^[1-9][0-9]{0,2}:[1-9][0-9]{0,2}$' then return false; end if;
 c:=split_part(p_key,':',1)::int; v:=split_part(p_key,':',2)::int;
 return coalesce(c between 1 and 114 and v between 1 and counts[c],false);
end $$;
create function private.tilawa_valid_range(p_range text) returns boolean language plpgsql immutable set search_path='' as $$
declare a text:=split_part(p_range,'-',1); b text:=split_part(p_range,'-',2);
begin
 return private.tilawa_valid_verse(a) and private.tilawa_valid_verse(b) and (split_part(a,':',1)::int,split_part(a,':',2)::int)<=(split_part(b,':',1)::int,split_part(b,':',2)::int) and array_length(string_to_array(p_range,'-'),1)=2;
end $$;
revoke all on function private.tilawa_valid_verse(text),private.tilawa_valid_range(text) from public,anon,authenticated;
alter table public.quran_bookmarks add constraint valid_ayah check(type<>'ayah' or private.tilawa_valid_verse(key||':'||verse_number));
alter table public.quran_reading_sessions add constraint valid_session_verse check(private.tilawa_valid_verse(chapter_number||':'||verse_number));
alter table public.quran_note_ranges add constraint valid_note_range check(private.tilawa_valid_range(range));
alter table public.quran_pinned_items add constraint valid_pin_verse check(target_type<>'ayah' or private.tilawa_valid_verse(target_id));
alter table public.quran_goals add constraint valid_goal_target check(category='QURAN' and (duration is null or duration between 1 and 3660) and
 case when type='QURAN_RANGE' then private.tilawa_valid_range(target_amount)
 when type in ('QURAN_TIME','QURAN_PAGES') then case when target_amount ~ '^[0-9]+(\.[0-9]+)?$' then target_amount::numeric>0 and target_amount::numeric<=case when type='QURAN_TIME' then 86400*coalesce(duration,1) else 604 end else false end else false end);
alter table public.quran_activity_days alter column pages_read type numeric(8,3);
create function private.tilawa_validate_activity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.seconds_read>86400 or new.pages_read>604 or array_length(new.ranges,1)>1000 or exists(select 1 from unnest(new.ranges) r where not private.tilawa_valid_range(r)) then raise exception using errcode='22023',message='INVALID_ACTIVITY'; end if;
 return new;
end $$;
revoke all on function private.tilawa_validate_activity() from public,anon,authenticated;
create trigger tilawa_activity_valid before insert or update on public.quran_activity_days for each row execute function private.tilawa_validate_activity();
create or replace function private.tilawa_quran_command(p_action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare caller uuid:=private.tilawa_require_user(); record_id uuid; collection_id uuid; mushaf int:=coalesce((p->>'mushaf')::int,(p->>'mushafId')::int,1);
 result jsonb:='{}'; item jsonb; range_value text; at_time timestamptz;
begin
 if jsonb_typeof(p)<>'object' or pg_column_size(p)>500000 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 if p_action='bookmark.save' then
  perform pg_advisory_xact_lock(hashtextextended('tilawa-quran:'||caller::text,0));
  if (p->>'type' in ('ayah','surah') and (p->>'key')::int not between 1 and 114) or (p->>'type'='page' and (p->>'key')::int not between 1 and 604) or (p->>'type'='juz' and (p->>'key')::int not between 1 and 30) then raise exception using errcode='22023',message='INVALID_BOOKMARK'; end if;
  if p ? 'isReading' and not coalesce((p->>'isReading')::boolean,false) then delete from public.quran_bookmarks where user_id=caller and mushaf_id=mushaf and is_reading and type=p->>'type' and key=(p->>'key')::int and verse_number is not distinct from (p->>'verseNumber')::int; end if;
  if coalesce((p->>'isReading')::boolean,false) then delete from public.quran_bookmarks where user_id=caller and mushaf_id=mushaf and is_reading; end if;
  insert into public.quran_bookmarks(user_id,mushaf_id,type,key,verse_number,is_reading,created_at)
  values(caller,mushaf,p->>'type',(p->>'key')::int,(p->>'verseNumber')::int,coalesce((p->>'isReading')::boolean,false),least(coalesce((p->>'createdAt')::timestamptz,now()),now()))
  on conflict(user_id,mushaf_id,type,key,verse_number,is_reading) do update set key=excluded.key returning id into record_id;
  if not coalesce((p->>'isReading')::boolean,false) then
   if nullif(p->>'collectionId','') is not null then
    select id into collection_id from public.quran_collections where id=(p->>'collectionId')::uuid and user_id=caller;
    if collection_id is null then raise exception using errcode='42501',message='FORBIDDEN'; end if;
   else
    insert into public.quran_collections(user_id,name,is_default) values(caller,'Bookmarks',true) on conflict(user_id) where is_default do nothing;
    select id into collection_id from public.quran_collections where user_id=caller and is_default;
   end if;
   insert into public.quran_collection_bookmarks(collection_id,bookmark_id,user_id) values(collection_id,record_id,caller) on conflict do nothing;
  end if;
  select to_jsonb(b) into result from public.quran_bookmarks b where id=record_id;
 elsif p_action='bookmark.delete' then
  delete from public.quran_bookmarks where id=(p->>'id')::uuid and user_id=caller;
 elsif p_action='collection.save' then
  record_id:=nullif(p->>'id','')::uuid;
  if record_id is not null and not exists(select 1 from public.quran_collections where id=record_id and user_id=caller) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  insert into public.quran_collections(id,user_id,name) values(coalesce(record_id,gen_random_uuid()),caller,trim(p->>'name')) on conflict(id) do update set name=excluded.name,updated_at=now() returning to_jsonb(quran_collections.*) into result;
 elsif p_action='collection.delete' then
  delete from public.quran_collections where id=(p->>'id')::uuid and user_id=caller and not is_default;
 elsif p_action='collection.unlink' then
  delete from public.quran_collection_bookmarks where collection_id=(p->>'collectionId')::uuid and bookmark_id=(p->>'bookmarkId')::uuid and user_id=caller;
 elsif p_action='note.save' then
  record_id:=nullif(p->>'id','')::uuid;
  if record_id is not null and not exists(select 1 from public.quran_notes where id=record_id and user_id=caller) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  insert into public.quran_notes(id,user_id,title,body) values(coalesce(record_id,gen_random_uuid()),caller,coalesce(p->>'title',''),p->>'body') on conflict(id) do update set title=excluded.title,body=excluded.body,updated_at=now() returning id into record_id;
  if p ? 'ranges' then
   delete from public.quran_note_ranges where note_id=record_id and user_id=caller;
   for range_value in select jsonb_array_elements_text(p->'ranges') loop
    insert into public.quran_note_ranges(note_id,user_id,range) values(record_id,caller,range_value) on conflict do nothing;
   end loop;
  end if;
  select to_jsonb(n) into result from public.quran_notes n where id=record_id;
 elsif p_action='note.delete' then delete from public.quran_notes where id=(p->>'id')::uuid and user_id=caller;
 elsif p_action='preference.save' then
  if p->>'group' not in ('tafsirs','translations','audio','theme','quranReaderStyles','reading','language','readingBookmark') or jsonb_typeof(p->'values')<>'object' then raise exception using errcode='22023',message='INVALID_PREFERENCE'; end if;
  insert into public.quran_preferences(user_id,mushaf_id,preference_group,value) values(caller,coalesce((p->>'mushafId')::int,0),p->>'group',p->'values')
  on conflict(user_id,mushaf_id,preference_group) do update set value=public.quran_preferences.value||excluded.value,updated_at=now();
 elsif p_action='session.save' then
  at_time:=least(coalesce((p->>'updatedAt')::timestamptz,now()),now());
  insert into public.quran_reading_sessions(user_id,chapter_number,verse_number,updated_at) values(caller,(p->>'chapterNumber')::int,(p->>'verseNumber')::int,at_time)
  on conflict(user_id,chapter_number,verse_number) do update set updated_at=greatest(public.quran_reading_sessions.updated_at,excluded.updated_at);
 elsif p_action='pinned.save' then
  insert into public.quran_pinned_items(user_id,target_type,target_id,metadata) values(caller,coalesce(p->>'targetType','ayah'),p->>'targetId',coalesce(p->'metadata','{}')) on conflict(user_id,target_type,target_id) do update set metadata=excluded.metadata returning to_jsonb(quran_pinned_items.*) into result;
 elsif p_action='pinned.delete' then
  delete from public.quran_pinned_items where user_id=caller and ((p ? 'id' and id=(p->>'id')::uuid) or (p ? 'targetId' and target_id=p->>'targetId') or coalesce((p->>'clear')::boolean,false));
 elsif p_action='goal.save' then
  insert into public.quran_goals(user_id,category,mushaf_id,type,target_amount,duration) values(caller,coalesce(p->>'category','QURAN'),mushaf,p->>'type',p->>'amount',(p->>'duration')::int)
  on conflict(user_id,category) do update set mushaf_id=excluded.mushaf_id,type=excluded.type,target_amount=excluded.target_amount,duration=excluded.duration,created_at=now(),updated_at=now() returning to_jsonb(quran_goals.*) into result;
 elsif p_action='goal.delete' then delete from public.quran_goals where user_id=caller and category=coalesce(p->>'category','QURAN');
 elsif p_action='activity.save' then
  if coalesce((p->>'seconds')::int,0) not between 0 and 86400 or coalesce((p->>'pages')::numeric,0) not between 0 and 604 then raise exception using errcode='22023',message='INVALID_ACTIVITY'; end if;
  select time_zone into range_value from public.profiles where id=caller;
  if coalesce((p->>'date')::date,(now() at time zone range_value)::date)>(now() at time zone range_value)::date then raise exception using errcode='22023',message='INVALID_ACTIVITY'; end if;
  insert into public.quran_activity_days(user_id,date,mushaf_id,seconds_read,pages_read,ranges) values(caller,coalesce((p->>'date')::date,(now() at time zone range_value)::date),mushaf,coalesce((p->>'seconds')::int,0),coalesce((p->>'pages')::numeric,0),array(select jsonb_array_elements_text(coalesce(p->'ranges','[]'))))
  on conflict(user_id,date,mushaf_id) do update set seconds_read=least(86400,public.quran_activity_days.seconds_read+excluded.seconds_read),pages_read=least(604,public.quran_activity_days.pages_read+excluded.pages_read),ranges=array(select distinct unnest(public.quran_activity_days.ranges||excluded.ranges)) returning to_jsonb(quran_activity_days.*) into result;
 elsif p_action='sync.import' then
  perform pg_advisory_xact_lock(hashtextextended('tilawa-quran:'||caller::text,0));
  if not exists(select 1 from public.quran_sync_imports where user_id=caller and import_key=p->>'importKey') then
   for item in select * from jsonb_array_elements(coalesce(p->'bookmarks','[]')) loop
    if not coalesce((item->>'isReading')::boolean,false) or not exists(select 1 from public.quran_bookmarks where user_id=caller and mushaf_id=coalesce((item->>'mushaf')::int,1) and is_reading) then
     perform private.tilawa_quran_command('bookmark.save',item);
    end if;
   end loop;
   for item in select * from jsonb_array_elements(coalesce(p->'readingSessions','[]')) loop perform private.tilawa_quran_command('session.save',item); end loop;
   for item in select * from jsonb_array_elements(coalesce(p->'pinnedItems','[]')) loop perform private.tilawa_quran_command('pinned.save',item); end loop;
   insert into public.quran_sync_imports(user_id,import_key) values(caller,p->>'importKey');
  end if;
 else raise exception using errcode='22023',message='INVALID_ACTION'; end if;
 return coalesce(result,'{}');
end $$;
create or replace function private.tilawa_assert_slot(p_teacher uuid,p_student uuid,p_at timestamptz,p_minutes integer,p_exclude uuid default null) returns void
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
 if exists(select 1 from unnest(array[interval '-1 hour',interval '-30 minutes',interval '30 minutes',interval '1 hour']) shift where (p_at+shift) at time zone zone=local_at) then raise exception using errcode='22023',message='INVALID_BOOKING_TIME'; end if;
 if not exists(select 1 from public.teacher_availability a where a.teacher_id=p_teacher and a.weekday=extract(dow from local_at)::int and a.start_time=local_at::time and (local_at+make_interval(mins=>p_minutes))::date=local_at::date and a.end_time>=(local_at+make_interval(mins=>p_minutes))::time) then
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
create or replace function private.tilawa_available_slots(p_teacher uuid,p_date date,p_days int,p_minutes int) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); zone text; result jsonb;
begin
 if p_days not between 1 and 45 or p_minutes not between 1 and 120 then raise exception using errcode='22023',message='INVALID_WINDOW'; end if;
 select p.time_zone into zone from public.profiles p join public.teacher_profiles t on t.user_id=p.id where t.user_id=p_teacher and t.approval='approved';
 if zone is null then raise exception using errcode='42501',message='TEACHER_NOT_APPROVED'; end if;
 select coalesce(jsonb_agg(s.at_time order by s.at_time),'[]') into result from (
 select (d::date+a.start_time) at time zone zone as at_time,d::date+a.start_time as wall_time
 from generate_series(p_date::timestamp,(p_date+p_days-1)::timestamp,interval '1 day') d join public.teacher_availability a on a.teacher_id=p_teacher and a.weekday=extract(dow from d)::int and a.start_time+make_interval(mins=>p_minutes)<=a.end_time and a.start_time+make_interval(mins=>p_minutes)>a.start_time
 ) s where s.at_time>=now()+interval '1 hour' and s.at_time<=now()+interval '45 days'
 and s.at_time at time zone zone=s.wall_time
 and not exists(select 1 from unnest(array[interval '-1 hour',interval '-30 minutes',interval '30 minutes',interval '1 hour']) shift where (s.at_time+shift) at time zone zone=s.wall_time)
 and not exists(select 1 from public.booking_requests b where (b.teacher_id=p_teacher or b.student_id=caller) and b.status in ('pending','accepted') and (b.payment_status<>'unpaid' or b.slot_hold_expires_at>now())
  and b.scheduled_at<s.at_time+make_interval(mins=>p_minutes) and b.scheduled_at+make_interval(mins=>b.duration_minutes)>s.at_time)
 and not exists(select 1 from public.lessons l where (l.teacher_id=p_teacher or l.student_id=caller) and l.status='scheduled' and l.scheduled_at<s.at_time+make_interval(mins=>p_minutes) and l.scheduled_at+make_interval(mins=>l.duration_minutes)>s.at_time);
 return result;
end $$;
create function private.tilawa_goal_count(p_category text) returns bigint language sql stable security definer set search_path='' as $$ select count(*) from public.quran_goals where category=p_category $$;
revoke all on function private.tilawa_goal_count(text) from public;
grant execute on function private.tilawa_goal_count(text) to anon,authenticated;
create function public.tilawa_goal_count(category text) returns bigint language sql stable security invoker set search_path='' as $$ select private.tilawa_goal_count(category) $$;
revoke all on function public.tilawa_goal_count(text) from public;
grant execute on function public.tilawa_goal_count(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
