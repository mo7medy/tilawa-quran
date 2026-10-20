begin;
create function private.tilawa_account_bootstrap() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user();
begin
 return jsonb_build_object(
 'profile',(select to_jsonb(p) from public.profiles p where id=caller),
 'student',(select to_jsonb(s) from public.student_profiles s where user_id=caller),
 'teacher',(select to_jsonb(t) from public.teacher_profiles t where user_id=caller),
 'contacts',(select to_jsonb(c) from public.teacher_private_contacts c where teacher_id=caller),
 'isAdmin',private.tilawa_admin_member(),'adminVerified',private.tilawa_is_admin(),
 'settings',(select to_jsonb(s) from public.platform_settings s where id),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('offer',to_jsonb(o),'qualifications',coalesce((select jsonb_agg(q.description) from public.teacher_qualifications q where teacher_id=caller),'[]')))
 from public.teacher_profiles t left join public.teacher_offers o on o.teacher_id=t.user_id where t.user_id=caller),'[]'),
 'balances',jsonb_build_object('pending',coalesce((select sum(amount_cents) from public.earnings_transactions where teacher_id=caller and status='pending'),0),
 'available',greatest(0,coalesce((select sum(amount_cents) from public.earnings_transactions where teacher_id=caller and status='available'),0)-coalesce((select sum(amount_cents) from public.withdrawal_requests where teacher_id=caller and status in ('pending','approved','paid')),0)),
 'withdrawals',coalesce((select sum(amount_cents) from public.withdrawal_requests where teacher_id=caller and status in ('pending','approved')),0)),
 'unreadNotifications',(select count(*) from public.notifications where user_id=caller and read_at is null));
end $$;
revoke all on function private.tilawa_account_bootstrap() from public,anon;
grant execute on function private.tilawa_account_bootstrap() to authenticated;
create function public.tilawa_account_bootstrap() returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_account_bootstrap() $$;
revoke all on function public.tilawa_account_bootstrap() from public,anon;
grant execute on function public.tilawa_account_bootstrap() to authenticated;

create function private.tilawa_account_view(p_view text,p_id uuid default null,p_page int default 1,p_status text default 'all') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); result jsonb:='{}'; items jsonb:='[]'; total bigint:=0; ids uuid[]; teacher_ids uuid[]; people_ids uuid[];
begin
 if p_view is null or p_view not in ('home','dashboard','profile','lesson','lessons','requests','packages','teachers','students','reviews','availability','coupons','earnings','withdrawals','messages','notifications')
  or p_page is null or p_page not between 1 and 100000 or p_status is null or p_status not in ('all','scheduled','completed','cancelled') then
  raise exception using errcode='22023',message='INVALID_INPUT';
 end if;
 if p_view in ('home','dashboard','lesson','lessons','reviews','students') then
  with eligible as (
   select l.* from public.lessons l where caller in (l.student_id,l.teacher_id)
   and (p_view<>'lesson' or l.id=p_id)
   and (p_view<>'students' or (l.teacher_id=caller and l.student_id=p_id))
   and (p_view<>'reviews' or (l.teacher_id=caller and exists(select 1 from public.reviews r where r.lesson_id=l.id)))
   and (p_status='all' or l.status=p_status)
   and (p_view not in ('home','dashboard') or (l.status='scheduled' and l.scheduled_at+make_interval(mins=>l.duration_minutes)>now()))
   and (p_view<>'dashboard' or (l.scheduled_at at time zone (select time_zone from public.profiles where id=caller))::date=(now() at time zone (select time_zone from public.profiles where id=caller))::date)
  ), page as (select * from eligible order by
   case when p_view in ('home','dashboard') then scheduled_at end asc,scheduled_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object(
   'completion',(select to_jsonb(c) from public.lesson_completion_requests c where lesson_id=l.id order by created_at desc,id desc limit 1),
   'cancellation',(select to_jsonb(c) from public.lesson_cancellation_requests c where lesson_id=l.id order by created_at desc,id desc limit 1),
   'review',(select to_jsonb(r) from public.reviews r where lesson_id=l.id),
   'history',case when p_view='lesson' then coalesce((select jsonb_agg(e.action order by e.created_at,e.id) from public.lesson_events e where lesson_id=l.id),'[]') else '[]' end
  )),'[]'),(select count(*) from eligible) into items,total from page l;
  result:=jsonb_build_object('lessons',items);
 end if;
 if p_view='requests' then
  with eligible as (select * from public.booking_requests b where (student_id=caller or (teacher_id=caller and payment_status<>'unpaid')) and (p_id is null or id=p_id)),
  page as (select * from eligible order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('lesson_id',(select id from public.lessons where booking_id=b.id)) order by b.created_at desc,b.id desc),'[]'),(select count(*) from eligible) into items,total from page b;
  result:=jsonb_build_object('requests',items);
 elsif p_view='packages' then
  with eligible as (select * from public.student_subscriptions where student_id=caller),
  page as (select * from eligible order by starts_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('credits_summary',private.tilawa_subscription_credits(s.id)) order by starts_at desc,id desc),'[]'),(select count(*) from eligible) into items,total from page s;
  result:=jsonb_build_object('subscriptions',items);
 elsif p_view in ('earnings','withdrawals') then
  with eligible as (select id,created_at,to_jsonb(e) as item from public.earnings_transactions e where teacher_id=caller and p_view='earnings'
   union all select id,created_at,to_jsonb(w) from public.withdrawal_requests w where teacher_id=caller and p_view='withdrawals'),
  page as (select * from eligible order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]'),(select count(*) from eligible) into items,total from page;
  result:=jsonb_build_object(p_view,items);
 elsif p_view='notifications' then
  with page as (select * from public.notifications where user_id=caller order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(to_jsonb(n) order by created_at desc,id desc),'[]'),(select count(*) from public.notifications where user_id=caller) into items,total from page n;
  result:=jsonb_build_object('notifications',items);
 elsif p_view='messages' then
  with eligible as (select * from public.direct_conversations where caller in (student_id,teacher_id)),
  page as (select * from eligible order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('blocked',coalesce((select bool_or(blocked) from public.direct_conversation_user_states where conversation_id=c.id),false),
   'own_state',(select to_jsonb(s) from public.direct_conversation_user_states s where conversation_id=c.id and user_id=caller)) order by c.created_at desc,c.id desc),'[]'),(select count(*) from eligible) into items,total from page c;
  -- A linked conversation remains accessible even when it is outside the current directory page.
  if p_id is not null and not exists(select 1 from jsonb_array_elements(items) x where x->>'id'=p_id::text) then
   items:=items||coalesce((select jsonb_build_array(to_jsonb(c)||jsonb_build_object('blocked',coalesce((select bool_or(blocked) from public.direct_conversation_user_states where conversation_id=c.id),false),'own_state',(select to_jsonb(s) from public.direct_conversation_user_states s where conversation_id=c.id and user_id=caller))) from public.direct_conversations c where id=p_id and caller in (student_id,teacher_id)),'[]');
  end if;
  result:=jsonb_build_object('conversations',items);
 elsif p_view='availability' then
  result:=jsonb_build_object('availability',coalesce((select jsonb_agg(a order by weekday,start_time,id) from public.teacher_availability a where teacher_id=caller),'[]'));
 elsif p_view='coupons' then
  with page as (select * from public.teacher_discount_coupons where teacher_id=caller order by id limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(c order by id),'[]'),(select count(*) from public.teacher_discount_coupons where teacher_id=caller) into items,total from page c;
  result:=jsonb_build_object('coupons',items);
 elsif p_view='profile' then
  with page as (select * from public.teacher_documents where teacher_id=caller order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select coalesce(jsonb_agg(d order by created_at desc,id desc),'[]'),(select count(*) from public.teacher_documents where teacher_id=caller) into items,total from page d;
  result:=jsonb_build_object('documents',items,'approvalEvents',coalesce((select jsonb_agg(e order by created_at desc,id desc) from (select * from public.teacher_approval_events where teacher_id=caller order by created_at desc,id desc limit 25) e),'[]'));
 end if;
 -- Only identities used by this page; learning details are returned only to a related teacher.
 select array_agg(distinct x) into teacher_ids from (
  select (v->>'teacher_id')::uuid x from jsonb_array_elements(coalesce(result->'lessons','[]')||coalesce(result->'requests','[]')||coalesce(result->'subscriptions','[]')||coalesce(result->'conversations','[]')) v
 ) a where x is not null;
 select array_agg(distinct x) into people_ids from (
  select (v->>'student_id')::uuid x from jsonb_array_elements(coalesce(result->'lessons','[]')||coalesce(result->'requests','[]')||coalesce(result->'conversations','[]')) v
 ) a where x is not null;
 if p_view='teachers' then
  with related as (select t.user_id from public.teacher_profiles t where
   exists(select 1 from public.booking_requests b where b.teacher_id=t.user_id and b.student_id=caller)
   or exists(select 1 from public.lessons l where l.teacher_id=t.user_id and l.student_id=caller)
   or exists(select 1 from public.student_subscriptions s where s.teacher_id=t.user_id and s.student_id=caller)),
  page as (select user_id from related order by user_id limit 25 offset (p_page-1)*25)
  select array_agg(user_id),(select count(*) from related) into teacher_ids,total from page;
 elsif p_view='students' and p_id is null then
  with related as (select p.id from public.profiles p where private.tilawa_related_student(p.id)),
  page as (select id from related order by id limit 25 offset (p_page-1)*25)
  select array_agg(id),(select count(*) from related) into people_ids,total from page;
 elsif p_view='students' and private.tilawa_related_student(p_id) then people_ids:=array[p_id];
 end if;
 result:=result||jsonb_build_object('teachers',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('offer',to_jsonb(o),'qualifications',coalesce((select jsonb_agg(q.description) from public.teacher_qualifications q where teacher_id=t.user_id),'[]')))
  from public.teacher_profiles t left join public.teacher_offers o on o.teacher_id=t.user_id where t.user_id=any(teacher_ids)),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'country',p.country,'time_zone',p.time_zone,'avatar_path',p.avatar_path,
 'learning_goal',case when private.tilawa_related_student(p.id) then s.learning_goal else '' end,'preferred_schedule',case when private.tilawa_related_student(p.id) then s.preferred_schedule else '' end))
 from public.profiles p left join public.student_profiles s on s.user_id=p.id where p.id=any(people_ids)),'[]'),
 'pagination',jsonb_build_object('page',p_page,'pageSize',25,'total',total));
 return result;
end $$;
revoke all on function private.tilawa_account_view(text,uuid,int,text) from public,anon;
grant execute on function private.tilawa_account_view(text,uuid,int,text) to authenticated;
create function public.tilawa_account_view(p_view text,p_id uuid default null,p_page int default 1,p_status text default 'all') returns jsonb
language sql stable security invoker set search_path='' as $$ select private.tilawa_account_view(p_view,p_id,p_page,p_status) $$;
revoke all on function public.tilawa_account_view(text,uuid,int,text) from public,anon;
grant execute on function public.tilawa_account_view(text,uuid,int,text) to authenticated;

create function private.tilawa_admin_health() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 return jsonb_build_object('checkedAt',now(),'maintenance',(select jsonb_build_object('active',j.active,'lastStatus',r.status,'lastRun',r.start_time,'fresh',coalesce(r.status='succeeded' and r.start_time>now()-interval '15 minutes',false))
 from cron.job j left join lateral (select status,start_time from cron.job_run_details where jobid=j.jobid order by start_time desc limit 1) r on true where jobname='tilawa-maintenance'),
 'readsReady',to_regprocedure('public.tilawa_account_view(text,uuid,integer,text)') is not null and to_regprocedure('public.tilawa_admin_list(text,text,text,text,date,date,integer)') is not null);
end $$;
revoke all on function private.tilawa_admin_health() from public,anon;
grant execute on function private.tilawa_admin_health() to authenticated;
create function public.tilawa_admin_health() returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_health() $$;
revoke all on function public.tilawa_admin_health() from public,anon;
grant execute on function public.tilawa_admin_health() to authenticated;
create function private.tilawa_upload_referenced(p_bucket text,p_path text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user();
begin
 if p_bucket not in ('tilawa-avatars','tilawa-teacher-documents') or split_part(p_path,'/',1)<>caller::text then
  raise exception using errcode='42501',message='INVALID_DOCUMENT';
 end if;
 return case when p_bucket='tilawa-avatars' then
  exists(select 1 from public.profiles where avatar_path=p_path) or exists(select 1 from public.teacher_profiles where avatar_path=p_path)
 else exists(select 1 from public.teacher_documents where path=p_path) end;
end $$;
revoke all on function private.tilawa_upload_referenced(text,text) from public,anon;
grant execute on function private.tilawa_upload_referenced(text,text) to authenticated;
create function public.tilawa_upload_referenced(p_bucket text,p_path text) returns boolean language sql stable security invoker set search_path='' as $$ select private.tilawa_upload_referenced(p_bucket,p_path) $$;
revoke all on function public.tilawa_upload_referenced(text,text) from public,anon;
grant execute on function public.tilawa_upload_referenced(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
