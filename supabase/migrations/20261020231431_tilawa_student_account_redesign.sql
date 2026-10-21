begin;

-- Section reads retain their own contract; identity remains in bootstrap.
alter function private.tilawa_account_bootstrap() rename to tilawa_account_bootstrap_before_profile;
revoke all on function private.tilawa_account_bootstrap_before_profile() from public,anon,authenticated;
create function private.tilawa_unread_messages(p_conversation uuid default null) returns bigint
language sql stable security definer set search_path='' as $$
 select count(*) from public.direct_messages m
 join public.direct_conversations c on c.id=m.conversation_id
 left join public.direct_conversation_user_states s on s.conversation_id=c.id and s.user_id=(select auth.uid())
 where (select private.tilawa_require_user()) in (c.student_id,c.teacher_id)
 and (p_conversation is null or c.id=p_conversation)
 and c.request_status<>'rejected' and not coalesce(s.blocked,false) and s.hidden_at is null
 and m.sender_id<>(select auth.uid()) and m.retracted_at is null
 and (s.last_read_at is null or m.created_at>s.last_read_at)
$$;
revoke all on function private.tilawa_unread_messages(uuid) from public,anon,authenticated;
create function private.tilawa_account_bootstrap() returns jsonb
language sql stable security definer set search_path='' as $$
 select private.tilawa_account_bootstrap_before_profile()||jsonb_build_object('unreadMessages',private.tilawa_unread_messages())
$$;
revoke all on function private.tilawa_account_bootstrap() from public,anon;
grant execute on function private.tilawa_account_bootstrap() to authenticated;

alter function private.tilawa_account_view(text,uuid,int,text) rename to tilawa_account_view_before_profile;
revoke all on function private.tilawa_account_view_before_profile(text,uuid,int,text) from public,anon,authenticated;
create function private.tilawa_account_view(p_view text,p_id uuid default null,p_page int default 1,p_status text default 'all') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); result jsonb; subs jsonb; conversations jsonb;
begin
 result:=private.tilawa_account_view_before_profile(p_view,p_id,p_page,p_status);
 if p_view='home' then
  select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('credits_summary',private.tilawa_subscription_credits(s.id)) order by s.access_ends_at,s.id),'[]') into subs
  from public.student_subscriptions s where student_id=caller and status='active' and starts_at<=now() and access_ends_at>now();
  with latest as (
   select c.id,case when c.student_id=caller then c.teacher_id else c.student_id end as peer_id,
   coalesce(tp.display_name,p.display_name,'') as peer_name,m.body,m.created_at,m.id as message_id,
   private.tilawa_unread_messages(c.id) as unread
   from public.direct_conversations c
   left join public.direct_conversation_user_states s on s.conversation_id=c.id and s.user_id=caller
   join lateral (select id,body,created_at from public.direct_messages where conversation_id=c.id and retracted_at is null order by created_at desc,id desc limit 1) m on true
   join public.profiles p on p.id=case when c.student_id=caller then c.teacher_id else c.student_id end
   left join public.teacher_profiles tp on tp.user_id=p.id and c.student_id=caller
   where caller in (c.student_id,c.teacher_id) and c.request_status<>'rejected' and not coalesce(s.blocked,false) and s.hidden_at is null
   order by m.created_at desc,m.id desc limit 3
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'peerId',peer_id,'peerName',peer_name,'preview',left(body,160),'createdAt',created_at,'unread',unread) order by created_at desc,message_id desc),'[]') into conversations from latest;
  result:=result||jsonb_build_object('subscriptions',subs,'recentConversations',conversations);
 end if;
 return result;
end $$;
revoke all on function private.tilawa_account_view(text,uuid,int,text) from public,anon;
grant execute on function private.tilawa_account_view(text,uuid,int,text) to authenticated;

-- Keep the existing guarded teacher/booking/payment paths intact.
alter function private.tilawa_command(text,jsonb,uuid) rename to tilawa_command_before_profile;
revoke all on function private.tilawa_command_before_profile(text,jsonb,uuid) from public,anon,authenticated;
create function private.tilawa_command(p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); d jsonb; saved private.action_receipts%rowtype; birth date; zone text; photo text;
begin
 if p_action is distinct from 'student' then return private.tilawa_command_before_profile(p_action,p_payload,p_key); end if;
 if p_key is null or jsonb_typeof(p_payload) is distinct from 'object' or pg_column_size(p_payload)>100000 then
  raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('tilawa-command:'||caller::text||':'||p_key::text,0));
 select * into saved from private.action_receipts where user_id=caller and request_key=p_key;
 if found then
  if saved.action<>p_action or saved.payload<>p_payload then raise exception using errcode='22023',message='IDEMPOTENCY_CONFLICT'; end if;
  return saved.result;
 end if;
 d:=p_payload->'value'; zone:=d->>'zone'; photo:=nullif(d->>'photo','');
 if jsonb_typeof(d) is distinct from 'object'
  or jsonb_typeof(d->'name') is distinct from 'string' or length(btrim(d->>'name')) not between 1 and 100
  or jsonb_typeof(d->'country') is distinct from 'string' or length(btrim(d->>'country')) not between 1 and 80
  or (d->'goal' is not null and d->'goal'<>'null'::jsonb and jsonb_typeof(d->'goal')<>'string')
  or (d->'schedule' is not null and d->'schedule'<>'null'::jsonb and jsonb_typeof(d->'schedule')<>'string')
  or length(coalesce(d->>'goal',''))>1500 or length(coalesce(d->>'schedule',''))>200
  or not exists(select 1 from pg_timezone_names where name=zone) then
  raise exception using errcode='22023',message='INVALID_PROFILE'; end if;
 if nullif(d->>'birthDate','') is not null then
  begin
   if d->>'birthDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception using errcode='22023',message='INVALID_PROFILE'; end if;
   birth:=(d->>'birthDate')::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='22023',message='INVALID_PROFILE'; end;
  if birth>current_date then raise exception using errcode='22023',message='INVALID_PROFILE'; end if;
 end if;
 if photo is not null and (length(photo)>1024 or split_part(photo,'/',1)<>caller::text) then
  raise exception using errcode='42501',message='INVALID_PHOTO'; end if;
 update public.profiles set display_name=btrim(d->>'name'),country=btrim(d->>'country'),time_zone=zone,avatar_path=photo,updated_at=now() where id=caller;
 update public.student_profiles set birth_date=birth,learning_goal=btrim(coalesce(d->>'goal','')),preferred_schedule=btrim(coalesce(d->>'schedule','')) where user_id=caller;
 insert into private.action_receipts(user_id,request_key,action,payload,result) values(caller,p_key,p_action,p_payload,'{"ok":true}');
 return '{"ok":true}';
end $$;
revoke all on function private.tilawa_command(text,jsonb,uuid) from public,anon;
grant execute on function private.tilawa_command(text,jsonb,uuid) to authenticated;

-- Refresh the shared UI without polling private history pages.
alter publication supabase_realtime add table public.profiles,public.student_profiles,public.student_subscriptions,public.subscription_credit_ledger,public.direct_conversation_user_states;
notify pgrst,'reload schema';
commit;
