begin;
create function private.tilawa_quran_command(p_action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); record_id uuid; collection_id uuid; mushaf int:=coalesce((p->>'mushaf')::int,(p->>'mushafId')::int,1);
 result jsonb:='{}'; item jsonb; range_value text; at_time timestamptz;
begin
 if jsonb_typeof(p)<>'object' or pg_column_size(p)>500000 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 if p_action='bookmark.save' then
  perform pg_advisory_xact_lock(hashtextextended('tilawa-quran:'||caller::text,0));
  if (p->>'type' in ('ayah','surah') and (p->>'key')::int not between 1 and 114) or (p->>'type'='page' and (p->>'key')::int not between 1 and 604) or (p->>'type'='juz' and (p->>'key')::int not between 1 and 30) then raise exception using errcode='22023',message='INVALID_BOOKMARK'; end if;
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
  on conflict(user_id,category) do update set mushaf_id=excluded.mushaf_id,type=excluded.type,target_amount=excluded.target_amount,duration=excluded.duration,updated_at=now() returning to_jsonb(quran_goals.*) into result;
 elsif p_action='goal.delete' then delete from public.quran_goals where user_id=caller and category=coalesce(p->>'category','QURAN');
 elsif p_action='activity.save' then
  if coalesce((p->>'seconds')::int,0) not between 0 and 86400 or coalesce((p->>'pages')::int,0) not between 0 and 604 or coalesce((p->>'date')::date,current_date)>current_date then raise exception using errcode='22023',message='INVALID_ACTIVITY'; end if;
  select time_zone into range_value from public.profiles where id=caller;
  insert into public.quran_activity_days(user_id,date,mushaf_id,seconds_read,pages_read,ranges) values(caller,coalesce((p->>'date')::date,(now() at time zone range_value)::date),mushaf,coalesce((p->>'seconds')::int,0),coalesce((p->>'pages')::int,0),array(select jsonb_array_elements_text(coalesce(p->'ranges','[]'))))
  on conflict(user_id,date,mushaf_id) do update set seconds_read=least(86400,public.quran_activity_days.seconds_read+excluded.seconds_read),pages_read=least(604,public.quran_activity_days.pages_read+excluded.pages_read),ranges=array(select distinct unnest(public.quran_activity_days.ranges||excluded.ranges)) returning to_jsonb(quran_activity_days.*) into result;
 elsif p_action='sync.import' then
  perform pg_advisory_xact_lock(hashtextextended('tilawa-quran:'||caller::text,0));
  if not exists(select 1 from public.quran_sync_imports where user_id=caller and import_key=p->>'importKey') then
   for item in select * from jsonb_array_elements(coalesce(p->'bookmarks','[]')) loop perform private.tilawa_quran_command('bookmark.save',item); end loop;
   for item in select * from jsonb_array_elements(coalesce(p->'readingSessions','[]')) loop perform private.tilawa_quran_command('session.save',item); end loop;
   for item in select * from jsonb_array_elements(coalesce(p->'pinnedItems','[]')) loop perform private.tilawa_quran_command('pinned.save',item); end loop;
   insert into public.quran_sync_imports(user_id,import_key) values(caller,p->>'importKey');
  end if;
 else raise exception using errcode='22023',message='INVALID_ACTION'; end if;
 return coalesce(result,'{}');
end $$;
revoke all on function private.tilawa_quran_command(text,jsonb) from public,anon;
grant execute on function private.tilawa_quran_command(text,jsonb) to authenticated;
create function public.tilawa_quran_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.tilawa_quran_command(action,payload) $$;
revoke all on function public.tilawa_quran_command(text,jsonb) from public,anon;
grant execute on function public.tilawa_quran_command(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
