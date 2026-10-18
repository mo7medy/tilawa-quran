begin;
-- Identical single-column indexes were reported by the live database advisor.
drop index public.teacher_approval_events_actor_idx;
drop index public.teacher_documents_teacher_idx;
drop index public.teacher_qualifications_teacher_idx;
create policy tilawa_active_storage_account on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('tilawa-avatars','tilawa-teacher-documents') or (select private.tilawa_active_account()))
 with check(bucket_id not in ('tilawa-avatars','tilawa-teacher-documents') or (select private.tilawa_active_account()));
create or replace function private.tilawa_related_student(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.booking_requests b where b.student_id=p_student and b.teacher_id=(select auth.uid()))
 or exists(select 1 from public.lessons l where l.student_id=p_student and l.teacher_id=(select auth.uid()))
 or exists(select 1 from public.student_subscriptions s where s.student_id=p_student and s.teacher_id=(select auth.uid()));
$$;
create or replace function private.tilawa_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 or exists(select 1 from public.student_subscriptions s where s.student_id=p.id and s.teacher_id=caller)
 or exists(select 1 from public.direct_conversations c where caller in (c.student_id,c.teacher_id) and p.id in (c.student_id,c.teacher_id))), '[]'),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('offer',to_jsonb(o),'qualifications',coalesce((select jsonb_agg(q.description) from public.teacher_qualifications q where q.teacher_id=t.user_id),'[]')))
 from public.teacher_profiles t left join public.teacher_offers o on o.teacher_id=t.user_id where t.user_id=caller
 or exists(select 1 from public.booking_requests b where b.teacher_id=t.user_id and b.student_id=caller)
 or exists(select 1 from public.student_subscriptions s where s.teacher_id=t.user_id and s.student_id=caller)
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
create or replace function private.tilawa_validate_earning() returns trigger language plpgsql security definer set search_path='' as $$
declare credited bigint; net integer;
begin
 select teacher_net_cents into net from public.payment_transactions where id=new.payment_id for update;
 select coalesce(sum(amount_cents),0) into credited from public.earnings_transactions where payment_id=new.payment_id and id<>new.id and status<>'reversed';
 if new.status<>'reversed' and (net is null or credited+new.amount_cents>net) then raise exception using errcode='23514',message='EARNING_LIMIT_EXCEEDED'; end if;
 if not exists(select 1 from public.payment_transactions p where p.id=new.payment_id and p.status='paid' and p.teacher_net_cents is not null and p.teacher_net_cents>=new.amount_cents) then raise exception using errcode='23514',message='VERIFIED_EARNING_REQUIRED'; end if;
 if new.lesson_id is not null and not exists(select 1 from public.lessons l join public.booking_requests b on b.id=l.booking_id where l.id=new.lesson_id and l.status='completed' and l.teacher_id=new.teacher_id and l.lesson_type<>'intro' and b.payment_id=new.payment_id and l.subscription_id is null) then raise exception using errcode='23514',message='COMPLETED_PAID_LESSON_REQUIRED'; end if;
 if new.subscription_id is not null and not exists(select 1 from public.student_subscriptions s where s.id=new.subscription_id and s.teacher_id=new.teacher_id and s.payment_id=new.payment_id and s.access_ends_at<=now()) then raise exception using errcode='23514',message='MATURED_TEACHER_SUBSCRIPTION_REQUIRED'; end if;
 return new;
end $$;
notify pgrst,'reload schema';
commit;
