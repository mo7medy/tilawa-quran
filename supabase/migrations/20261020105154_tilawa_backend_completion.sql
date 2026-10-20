begin;

-- Membership is sufficient only for the MFA bootstrap, never administrative data.
create function private.tilawa_admin_member() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admin_memberships a join public.profiles p on p.id=a.user_id
 where a.user_id=(select auth.uid()) and p.disabled_at is null)
$$;
revoke all on function private.tilawa_admin_member() from public,anon;
grant execute on function private.tilawa_admin_member() to authenticated;
create or replace function private.tilawa_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select private.tilawa_admin_member() and coalesce((select auth.jwt())->>'aal','')='aal2'
$$;
create function public.tilawa_admin_access() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('member',private.tilawa_admin_member(),'verified',private.tilawa_is_admin())
$$;
revoke all on function public.tilawa_admin_access() from public,anon;
grant execute on function public.tilawa_admin_access() to authenticated;

create function private.tilawa_has_text(p jsonb) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(p)='object' and
 ((jsonb_typeof(p->'en')='string' and length(btrim(p->>'en')) between 1 and 5000)
 or (jsonb_typeof(p->'ar')='string' and length(btrim(p->>'ar')) between 1 and 5000)),false)
$$;
revoke all on function private.tilawa_has_text(jsonb) from public,anon,authenticated;

-- Preserve the existing booking, credit, idempotency and financial implementation.
alter function private.tilawa_command(text,jsonb,uuid) rename to tilawa_command_core;
revoke all on function private.tilawa_command_core(text,jsonb,uuid) from public,anon,authenticated;
create function private.tilawa_command(p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); d jsonb; p jsonb; q jsonb; mode text; tp public.teacher_profiles%rowtype;
begin
 if p_key is null or jsonb_typeof(p_payload) is distinct from 'object' or pg_column_size(p_payload)>100000 then
  raise exception using errcode='22023',message='INVALID_INPUT';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('tilawa-command:'||caller::text||':'||p_key::text,0));
 if p_action like 'admin-%' and not private.tilawa_is_admin() then
  raise exception using errcode='42501',message='ADMIN_REQUIRED';
 end if;
 if p_action='teacher' then
  if p_payload#>>'{value,pricing}'='monthly' then p_payload:=jsonb_set(p_payload,'{value,publicProfile,sessionPriceCents}','0');
  elsif p_payload#>>'{value,pricing}'='perLesson' then p_payload:=jsonb_set(jsonb_set(p_payload,'{value,monthlyPriceCents}','0'),'{value,monthlyLessons}','8'); end if;
 end if;
 -- A retry must return the original receipt even if submission has since changed state.
 if exists(select 1 from private.action_receipts where user_id=caller and request_key=p_key) then
  return private.tilawa_command_core(p_action,p_payload,p_key);
 end if;
 if p_action='time-zone' then
  if not exists(select 1 from pg_timezone_names where name=p_payload->>'zone') then
   raise exception using errcode='22023',message='INVALID_TIME_ZONE';
  end if;
  perform private.tilawa_schedule_lock(caller,caller);
  update public.profiles set time_zone=p_payload->>'zone',updated_at=now() where id=caller;
  insert into private.action_receipts(user_id,request_key,action,payload,result) values(caller,p_key,p_action,p_payload,'{"ok":true}');
  return '{"ok":true}';
 end if;
 if p_action='teacher' then
  d:=p_payload->'value'; p:=d->'publicProfile'; mode:=d->>'pricing';
  if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(p) is distinct from 'object'
   or length(btrim(coalesce(p->>'displayName',''))) not between 1 and 100
   or length(btrim(coalesce(d->>'country',''))) not between 1 and 80
   or length(coalesce(d->>'phone',''))>30 or length(regexp_replace(coalesce(d->>'phone',''),'[^0-9]','','g'))<8
   or not private.tilawa_has_text(p->'biography') or not private.tilawa_has_text(p->'approach')
   or jsonb_typeof(p->'teachingLanguages') is distinct from 'array'
   or jsonb_typeof(p->'qualifications') is distinct from 'array'
   or jsonb_typeof(p->'specialties') is distinct from 'array'
   or mode is null or mode not in ('perLesson','monthly','both') then
   raise exception using errcode='22023',message='INVALID_TEACHER';
  end if;
  if jsonb_array_length(p->'teachingLanguages') not between 1 and 10
   or exists(select 1 from jsonb_array_elements(p->'teachingLanguages') x where jsonb_typeof(x)<>'string' or length(btrim(x#>>'{}')) not between 1 and 80)
   or jsonb_array_length(p->'qualifications') not between 1 and 30
   or exists(select 1 from jsonb_array_elements(p->'qualifications') x where not private.tilawa_has_text(x))
   or coalesce(d->>'experience','') !~ '^[0-9]{1,2}$'
   or (d->>'experience')::int not between 0 and 80
   or coalesce(p->>'sessionDurationMinutes','') !~ '^[0-9]{2,3}$' then
   raise exception using errcode='22023',message='INVALID_TEACHER';
  end if;
  if mode in ('perLesson','both') and (coalesce(p->>'sessionPriceCents','') !~ '^[1-9][0-9]{0,8}$') then
   raise exception using errcode='22023',message='INVALID_TEACHER_PRICE';
  end if;
  if mode in ('monthly','both') and (coalesce(d->>'monthlyPriceCents','') !~ '^[1-9][0-9]{0,8}$'
   or coalesce(d->>'monthlyLessons','') !~ '^[1-9][0-9]?$') then
   raise exception using errcode='22023',message='INVALID_TEACHER_PRICE';
  end if;
  if mode='monthly' then
   p_payload:=jsonb_set(p_payload,'{value,publicProfile,sessionPriceCents}','0');
  elsif mode='perLesson' then
   p_payload:=jsonb_set(jsonb_set(p_payload,'{value,monthlyPriceCents}','0'),'{value,monthlyLessons}','8');
  end if;
 elsif p_action='submit-teacher' then
  select * into tp from public.teacher_profiles where user_id=caller;
  if tp.user_id is null or not private.tilawa_has_text(tp.biography) or not private.tilawa_has_text(tp.approach)
   or length(btrim(tp.country))=0 or cardinality(tp.teaching_languages)=0
   or exists(select 1 from unnest(tp.teaching_languages) x where length(btrim(x))=0)
   or not exists(select 1 from public.teacher_qualifications where teacher_id=caller and private.tilawa_has_text(description))
   or not exists(select 1 from public.teacher_private_contacts where teacher_id=caller and length(regexp_replace(phone,'[^0-9]','','g'))>=8)
   or not exists(select 1 from public.teacher_offers where teacher_id=caller
    and (pricing='monthly' or price_cents>0) and (pricing='perLesson' or (monthly_price_cents>0 and monthly_lessons between 1 and 60))) then
   raise exception using errcode='22023',message='INCOMPLETE_TEACHER';
  end if;
 end if;
 return private.tilawa_command_core(p_action,p_payload,p_key);
end $$;
revoke all on function private.tilawa_command(text,jsonb,uuid) from public,anon;
grant execute on function private.tilawa_command(text,jsonb,uuid) to authenticated;

create index admin_audit_created_page_idx on public.admin_audit_logs(created_at desc,id desc);
create index notifications_user_page_idx on public.notifications(user_id,created_at desc,id desc);
create index messages_conversation_page_idx on public.direct_messages(conversation_id,created_at desc,id desc);

create function private.tilawa_admin_list(p_section text,p_search text default '',p_status text default 'all',p_subject text default 'all',p_from date default null,p_until date default null,p_page int default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 if p_section not in ('students','teachers','lessons','subscriptions','audit') or p_section is null
  or p_search is null or length(p_search)>100 or p_status is null or p_subject is null
  or p_subject not in ('all','arabic','quran') or p_page is null or p_page not between 1 and 100000
  or (p_from is null)<>(p_until is null) or (p_from is not null and (p_until<=p_from or p_until-p_from>366)) then
  raise exception using errcode='22023',message='INVALID_INPUT';
 end if;
 if not (p_status='all' or (p_section='students' and p_status in ('active','disabled'))
  or (p_section='teachers' and p_status in ('incomplete','pending','approved','rejected'))
  or (p_section='lessons' and p_status in ('scheduled','completed','cancelled'))
  or (p_section='subscriptions' and p_status in ('active','expired','cancelled'))
  or (p_section='audit' and p_status in ('admin-teacher','admin-settings'))) then
  raise exception using errcode='22023',message='INVALID_INPUT';
 end if;
 with records as (
  select p.id,p.created_at,p.display_name as search_text,
   jsonb_build_object('id',p.id,'name',p.display_name,'country',p.country,'zone',p.time_zone,'created_at',p.created_at,'status',case when p.disabled_at is null then 'active' else 'disabled' end) as item
  from public.profiles p join public.student_profiles s on s.user_id=p.id where p_section='students'
  union all
  select t.user_id,t.created_at,t.display_name||' '||coalesce(u.email,''),jsonb_build_object('id',t.user_id,'name',t.display_name,'country',t.country,'status',t.approval,'created_at',t.created_at)
  from public.teacher_profiles t join auth.users u on u.id=t.user_id where p_section='teachers'
  union all
  select l.id,l.scheduled_at,s.display_name||' '||t.display_name,jsonb_build_object('id',l.id,'student',s.display_name,'teacher',t.display_name,'subject',l.subject,'status',l.status,'created_at',l.scheduled_at,'duration',l.duration_minutes,'zone','UTC','type',l.lesson_type)
  from public.lessons l join public.profiles s on s.id=l.student_id join public.teacher_profiles t on t.user_id=l.teacher_id where p_section='lessons'
  union all
  select a.id,a.starts_at,s.display_name||' '||coalesce(t.display_name,''),jsonb_build_object('id',a.id,'student',s.display_name,'teacher',t.display_name,'kind',a.kind,'package',a.plan_id,'subject',a.subject,'status',case when a.status='active' and a.access_ends_at<=now() then 'expired' else a.status end,'created_at',a.starts_at,'ends_at',a.ends_at,'access_ends_at',a.access_ends_at,'duration',a.duration_minutes,'price_cents',a.price_cents,'credits',private.tilawa_subscription_credits(a.id))
  from public.student_subscriptions a join public.profiles s on s.id=a.student_id left join public.teacher_profiles t on t.user_id=a.teacher_id where p_section='subscriptions'
  union all
  select a.id,a.created_at,coalesce(p.display_name,'')||' '||a.action||' '||coalesce(a.target_id::text,''),jsonb_build_object('id',a.id,'name',p.display_name,'action',a.action,'target',a.target_id,'status',a.action,'created_at',a.created_at)
  from public.admin_audit_logs a left join public.profiles p on p.id=a.actor_id where p_section='audit'
 ), filtered as (
  select * from records where (p_search='' or strpos(lower(search_text),lower(p_search))>0)
  and (p_status='all' or item->>'status'=p_status) and (p_subject='all' or item->>'subject'=p_subject)
  and (p_from is null or (created_at>=p_from::timestamp at time zone 'UTC' and created_at<p_until::timestamp at time zone 'UTC'))
 ), page as (select * from filtered order by created_at desc,id desc limit 25 offset (p_page-1)*25)
 select jsonb_build_object('items',coalesce((select jsonb_agg(item order by created_at desc,id desc) from page),'[]'),'total',(select count(*) from filtered),'page',p_page,'pageSize',25) into result;
 return result;
end $$;

-- Full-ledger aggregates, never totals calculated from a visible history page.
create function private.tilawa_subscription_credits(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('remaining',greatest(0,coalesce(sum(delta) filter(where bucket='regular'),0)),
 'used',count(*) filter(where bucket='regular' and operation='consume'),
 'reserved',count(*) filter(where bucket='regular' and operation='reserve' and not exists(select 1 from public.subscription_credit_ledger e where e.booking_id=c.booking_id and e.operation in ('consume','release'))),
 'giftUsed',coalesce(bool_or(bucket='gift' and operation='consume'),false),
 'giftReserved',coalesce(bool_or(bucket='gift' and operation='reserve' and not exists(select 1 from public.subscription_credit_ledger e where e.booking_id=c.booking_id and e.operation in ('consume','release'))),false))
 from public.subscription_credit_ledger c where subscription_id=p_id
$$;
revoke all on function private.tilawa_subscription_credits(uuid) from public,anon,authenticated;

revoke all on function private.tilawa_admin_list(text,text,text,text,date,date,int) from public,anon;
grant execute on function private.tilawa_admin_list(text,text,text,text,date,date,int) to authenticated;
create function public.tilawa_admin_list(p_section text,p_search text default '',p_status text default 'all',p_subject text default 'all',p_from date default null,p_until date default null,p_page int default 1) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_list(p_section,p_search,p_status,p_subject,p_from,p_until,p_page) $$;
revoke all on function public.tilawa_admin_list(text,text,text,text,date,date,int) from public,anon;
grant execute on function public.tilawa_admin_list(text,text,text,text,date,date,int) to authenticated;

create function private.tilawa_admin_teacher(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 return (select to_jsonb(t)||jsonb_build_object('phone',c.phone,'email',u.email,
 'documents',coalesce((select jsonb_agg(d order by created_at desc,id desc) from public.teacher_documents d where teacher_id=t.user_id),'[]'),
 'events',coalesce((select jsonb_agg(e order by created_at desc,id desc) from (select * from public.teacher_approval_events where teacher_id=t.user_id order by created_at desc,id desc limit 100) e),'[]'))
 from public.teacher_profiles t join auth.users u on u.id=t.user_id left join public.teacher_private_contacts c on c.teacher_id=t.user_id where t.user_id=p_id);
end $$;
revoke all on function private.tilawa_admin_teacher(uuid) from public,anon;
grant execute on function private.tilawa_admin_teacher(uuid) to authenticated;
create function public.tilawa_admin_teacher(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_teacher(p_id) $$;
revoke all on function public.tilawa_admin_teacher(uuid) from public,anon;
grant execute on function public.tilawa_admin_teacher(uuid) to authenticated;

commit;
