begin;

-- Activity means a successfully stored message, never opening/reading the thread.
alter table public.direct_conversations add column last_message_at timestamptz;
update public.direct_conversations c set last_message_at=(
 select max(m.created_at) from public.direct_messages m where m.conversation_id=c.id
);
create index conversations_retention_idx on public.direct_conversations(last_message_at,id)
 where last_message_at is not null;

create function private.tilawa_track_message_activity() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 -- The command already locks this parent. Other insert paths take the same lock here.
 update public.direct_conversations set last_message_at=greatest(last_message_at,new.created_at)
 where id=new.conversation_id;
 return new;
end $$;
revoke all on function private.tilawa_track_message_activity() from public,anon,authenticated;
create trigger tilawa_message_activity after insert on public.direct_messages
 for each row execute function private.tilawa_track_message_activity();

-- Erase the duplicate message body in command receipts without making old requests replayable.
alter table private.action_receipts add column payload_hash text;
create index message_receipts_conversation_idx on private.action_receipts((result->>'id'))
 where action='message';
alter function private.tilawa_command(text,jsonb,uuid) rename to tilawa_command_before_retention;
revoke all on function private.tilawa_command_before_retention(text,jsonb,uuid) from public,anon,authenticated;
create function private.tilawa_command(p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); saved private.action_receipts%rowtype;
begin
 if p_key is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>100000 then
  raise exception using errcode='22023',message='INVALID_INPUT';
 end if;
 -- Serialize retries with the existing command before inspecting its receipt.
 perform pg_advisory_xact_lock(hashtextextended('tilawa-command:'||caller::text||':'||p_key::text,0));
 select * into saved from private.action_receipts where user_id=caller and request_key=p_key;
 if saved.payload_hash is not null then
  if saved.action<>p_action or saved.payload_hash<>encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') then
   raise exception using errcode='22023',message='IDEMPOTENCY_CONFLICT';
  end if;
  return saved.result;
 end if;
 return private.tilawa_command_before_retention(p_action,p_payload,p_key);
end $$;
revoke all on function private.tilawa_command(text,jsonb,uuid) from public,anon;
grant execute on function private.tilawa_command(text,jsonb,uuid) to authenticated;

create function private.tilawa_purge_inactive_messages() returns integer
language plpgsql security invoker set search_path='' as $$
declare conversation record; removed integer:=0; affected integer;
begin
 -- Bound each run and skip conversations currently being sent to. The parent lock
 -- prevents a concurrent send from being removed after the eligibility check.
 for conversation in
  select id from public.direct_conversations
  where last_message_at<=now()-interval '60 days'
  order by last_message_at,id limit 100 for update skip locked
 loop
  update private.action_receipts set
   payload_hash=encode(sha256(convert_to(payload::text,'UTF8')),'hex'),payload='{}'::jsonb
  where action='message' and result->>'id'=conversation.id::text and payload_hash is null;
  delete from public.direct_messages where conversation_id=conversation.id;
  get diagnostics affected=row_count;
  removed:=removed+affected;
  -- Keep participants, request status and read/block states. This UPDATE also gives
  -- Realtime a participant-scoped event; filtered DELETE events are not reliable.
  update public.direct_conversations set last_message_at=null where id=conversation.id;
 end loop;
 return removed;
end $$;
revoke all on function private.tilawa_purge_inactive_messages() from public,anon,authenticated;
select cron.schedule('tilawa-message-retention','*/5 * * * *','select private.tilawa_purge_inactive_messages()');

notify pgrst,'reload schema';
commit;
