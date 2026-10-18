begin;
create function public.tilawa_public_teachers() returns setof jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(t)||jsonb_build_object('offer',to_jsonb(o),'qualifications',coalesce((select jsonb_agg(q.description) from public.teacher_qualifications q where q.teacher_id=t.user_id),'[]'::jsonb),
 'rating',coalesce((select avg(r.rating)::numeric(3,2) from public.reviews r where r.teacher_id=t.user_id and r.visible),0),
 'review_count',(select count(*) from public.reviews r where r.teacher_id=t.user_id and r.visible),
 'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'rating',r.rating,'text',r.body,'createdAt',r.created_at)) from public.reviews r where r.teacher_id=t.user_id and r.visible),'[]'::jsonb))
 from public.teacher_profiles t left join public.teacher_offers o on o.teacher_id=t.user_id where t.approval='approved' order by t.created_at,t.user_id;
$$;
revoke all on function public.tilawa_public_teachers() from public;
grant execute on function public.tilawa_public_teachers() to anon,authenticated;

create function private.tilawa_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); result jsonb;
begin
 select jsonb_build_object(
 'profile',(select to_jsonb(p) from public.profiles p where id=caller),
 'student',(select to_jsonb(s) from public.student_profiles s where user_id=caller),
 'teacher',(select to_jsonb(t) from public.teacher_profiles t where user_id=caller),
 'contacts',(select to_jsonb(c) from public.teacher_private_contacts c where teacher_id=caller),
 'isAdmin',private.tilawa_is_admin(),
 'settings',(select to_jsonb(s) from public.platform_settings s where id),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'country',p.country,'time_zone',p.time_zone,'avatar_path',p.avatar_path,
 'learning_goal',s.learning_goal,'preferred_schedule',s.preferred_schedule)) from public.profiles p left join public.student_profiles s on s.user_id=p.id
 where p.id=caller or exists(select 1 from public.booking_requests b where b.student_id=p.id and b.teacher_id=caller)
 or exists(select 1 from public.lessons l where l.student_id=p.id and l.teacher_id=caller)
 or exists(select 1 from public.direct_conversations c where caller in (c.student_id,c.teacher_id) and p.id in (c.student_id,c.teacher_id))), '[]'),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('offer',to_jsonb(o),'qualifications',coalesce((select jsonb_agg(q.description) from public.teacher_qualifications q where q.teacher_id=t.user_id),'[]')))
 from public.teacher_profiles t left join public.teacher_offers o on o.teacher_id=t.user_id where t.user_id=caller
 or exists(select 1 from public.booking_requests b where b.teacher_id=t.user_id and b.student_id=caller)
 or exists(select 1 from public.direct_conversations c where c.teacher_id=t.user_id and c.student_id=caller)), '[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.booking_requests b where b.student_id=caller or (b.teacher_id=caller and b.payment_status<>'unpaid')),'[]'),
 'lessons',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object(
 'completion',coalesce((select to_jsonb(c) from public.lesson_completion_requests c where c.lesson_id=l.id order by c.created_at desc limit 1),'null'),
 'cancellation',coalesce((select to_jsonb(c) from public.lesson_cancellation_requests c where c.lesson_id=l.id order by c.created_at desc limit 1),'null'),
 'review',(select to_jsonb(r) from public.reviews r where r.lesson_id=l.id),
 'history',coalesce((select jsonb_agg(e.action order by e.created_at,e.id) from public.lesson_events e where e.lesson_id=l.id),'[]')) order by l.scheduled_at desc)
 from public.lessons l where caller in (l.student_id,l.teacher_id)),'[]'),
 'subscriptions',coalesce((select jsonb_agg(to_jsonb(s)) from public.student_subscriptions s where s.student_id=caller or s.teacher_id=caller),'[]'),
 'credits',coalesce((select jsonb_agg(to_jsonb(c)) from public.subscription_credit_ledger c join public.student_subscriptions s on s.id=c.subscription_id where s.student_id=caller or s.teacher_id=caller),'[]'),
 'availability',coalesce((select jsonb_agg(to_jsonb(a)) from public.teacher_availability a where a.teacher_id=caller),'[]'),
 'coupons',coalesce((select jsonb_agg(to_jsonb(c)) from public.teacher_discount_coupons c where c.teacher_id=caller),'[]'),
 'conversations',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('blocked',coalesce((select bool_or(s.blocked) from public.direct_conversation_user_states s where s.conversation_id=c.id),false),
 'own_state',(select to_jsonb(s) from public.direct_conversation_user_states s where s.conversation_id=c.id and s.user_id=caller))) from public.direct_conversations c where caller in (c.student_id,c.teacher_id)),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from (select m.* from public.direct_messages m join public.direct_conversations c on c.id=m.conversation_id
 where caller in (c.student_id,c.teacher_id) order by m.created_at desc,m.id desc limit 200) m),'[]'),
 'withdrawals',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at desc) from public.withdrawal_requests w where w.teacher_id=caller),'[]'),
 'earnings',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from public.earnings_transactions e where e.teacher_id=caller),'[]'),
 'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select * from public.notifications where user_id=caller order by created_at desc limit 50) n),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.teacher_documents d where d.teacher_id=caller),'[]'),
 'approvalEvents',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.teacher_approval_events a where a.teacher_id=caller),'[]')
 ) into result;
 return result;
end $$;
revoke all on function private.tilawa_snapshot() from public,anon;
grant execute on function private.tilawa_snapshot() to authenticated;
create function public.tilawa_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_snapshot() $$;
revoke all on function public.tilawa_snapshot() from public,anon;
grant execute on function public.tilawa_snapshot() to authenticated;

create function private.tilawa_admin_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.tilawa_require_user();
 if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
 return jsonb_build_object('settings',(select to_jsonb(s) from public.platform_settings s where id),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('phone',c.phone,
 'email',(select u.email from auth.users u where u.id=t.user_id),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.teacher_documents d where d.teacher_id=t.user_id),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from public.teacher_approval_events e where e.teacher_id=t.user_id),'[]')) order by t.created_at desc)
 from public.teacher_profiles t left join public.teacher_private_contacts c on c.teacher_id=t.user_id),'[]'),
 'audit',coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.admin_audit_logs order by created_at desc limit 100) a),'[]'));
end $$;
revoke all on function private.tilawa_admin_snapshot() from public,anon;
grant execute on function private.tilawa_admin_snapshot() to authenticated;
create function public.tilawa_admin_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_admin_snapshot() $$;
revoke all on function public.tilawa_admin_snapshot() from public,anon;
grant execute on function public.tilawa_admin_snapshot() to authenticated;

create function private.tilawa_available_slots(p_teacher uuid,p_date date,p_days int,p_minutes int) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=private.tilawa_require_user(); zone text; result jsonb;
begin
 if p_days not between 1 and 45 or p_minutes not between 1 and 120 then raise exception using errcode='22023',message='INVALID_WINDOW'; end if;
 select p.time_zone into zone from public.profiles p join public.teacher_profiles t on t.user_id=p.id where t.user_id=p_teacher and t.approval='approved';
 if zone is null then raise exception using errcode='42501',message='TEACHER_NOT_APPROVED'; end if;
 select coalesce(jsonb_agg(s.at_time order by s.at_time),'[]') into result from (
 select (d::date+a.start_time) at time zone zone as at_time,d::date+a.start_time as wall_time
 from generate_series(p_date::timestamp,(p_date+p_days-1)::timestamp,interval '1 day') d join public.teacher_availability a on a.teacher_id=p_teacher and a.weekday=extract(dow from d)::int
 ) s where s.at_time>=now()+interval '1 hour' and s.at_time<=now()+interval '45 days'
 and s.at_time at time zone zone=s.wall_time
 and not exists(select 1 from unnest(array[interval '-1 hour',interval '-30 minutes',interval '30 minutes',interval '1 hour']) shift where (s.at_time+shift) at time zone zone=s.wall_time)
 and not exists(select 1 from public.booking_requests b where (b.teacher_id=p_teacher or b.student_id=caller) and b.status in ('pending','accepted') and (b.payment_status<>'unpaid' or b.slot_hold_expires_at>now())
  and b.scheduled_at<s.at_time+make_interval(mins=>p_minutes) and b.scheduled_at+make_interval(mins=>b.duration_minutes)>s.at_time)
 and not exists(select 1 from public.lessons l where (l.teacher_id=p_teacher or l.student_id=caller) and l.status='scheduled' and l.scheduled_at<s.at_time+make_interval(mins=>p_minutes) and l.scheduled_at+make_interval(mins=>l.duration_minutes)>s.at_time);
 return result;
end $$;
revoke all on function private.tilawa_available_slots(uuid,date,int,int) from public,anon;
grant execute on function private.tilawa_available_slots(uuid,date,int,int) to authenticated;
create function public.tilawa_available_slots(teacher_id uuid,start_date date,days int,duration int) returns jsonb language sql stable security invoker set search_path='' as $$ select private.tilawa_available_slots(teacher_id,start_date,days,duration) $$;
revoke all on function public.tilawa_available_slots(uuid,date,int,int) from public,anon;
grant execute on function public.tilawa_available_slots(uuid,date,int,int) to authenticated;

-- Cron does not grant a user the ability to change financial state or complete regular lessons.
create function private.tilawa_maintenance() returns void language plpgsql security definer set search_path='' as $$
declare b public.booking_requests%rowtype; s public.student_subscriptions%rowtype; bucket_name text; balance int;
begin
 for b in select * from public.booking_requests where status='pending' and (scheduled_at<now() or (payment_status='unpaid' and slot_hold_expires_at<=now())) for update skip locked loop
  update public.booking_requests set status='expired' where id=b.id;
  perform private.tilawa_release_credit(b.id);
 end loop;
 update public.lessons set status='completed',completed_at=now() where status='scheduled' and lesson_type='intro' and scheduled_at+make_interval(mins=>duration_minutes)+interval '5 days'<=now();
 for s in select * from public.student_subscriptions where status='active' and access_ends_at<=now() for update skip locked loop
  update public.student_subscriptions set status='expired' where id=s.id;
  foreach bucket_name in array array['regular','gift'] loop
   select coalesce(sum(delta),0) into balance from public.subscription_credit_ledger where subscription_id=s.id and bucket=bucket_name;
   if balance>0 then insert into public.subscription_credit_ledger(subscription_id,bucket,operation,delta,event_key) values(s.id,bucket_name,'expire',-balance,'expire:'||s.id||':'||bucket_name) on conflict(event_key) do nothing; end if;
  end loop;
 end loop;
end $$;
revoke all on function private.tilawa_maintenance() from public,anon,authenticated;
create extension if not exists pg_cron with schema extensions;
select cron.schedule('tilawa-maintenance','*/5 * * * *','select private.tilawa_maintenance()');
notify pgrst,'reload schema';
commit;
