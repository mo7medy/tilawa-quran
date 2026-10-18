begin;
create or replace function private.tilawa_command(p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
 caller uuid:=private.tilawa_require_user(); value jsonb:=coalesce(p_payload,'{}'); result jsonb:='{"ok":true}';
 saved private.action_receipts%rowtype; tp public.teacher_profiles%rowtype; offer public.teacher_offers%rowtype;
 b public.booking_requests%rowtype; l public.lessons%rowtype; sub public.student_subscriptions%rowtype;
 cr public.lesson_completion_requests%rowtype; xr public.lesson_cancellation_requests%rowtype;
 conv public.direct_conversations%rowtype;
 target uuid; record_id uuid; at_time timestamptz; minutes integer; cents integer; balance bigint;
 item jsonb; details jsonb; profile jsonb; zone text; op text; bucket text; source text; category text; own_path text;
begin
 if p_key is null or jsonb_typeof(value)<>'object' or pg_column_size(value)>100000 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('tilawa-command:'||caller::text||':'||p_key::text,0));
 select * into saved from private.action_receipts where user_id=caller and request_key=p_key;
 if found then
  if saved.action<>p_action or saved.payload<>value then raise exception using errcode='22023',message='IDEMPOTENCY_CONFLICT'; end if;
  return saved.result;
 end if;

 if p_action='student' then
  details:=value->'value'; zone:=coalesce(details->>'zone','UTC');
  if nullif(trim(details->>'name'),'') is null or nullif(trim(details->>'country'),'') is null or nullif(trim(details->>'goal'),'') is null or nullif(trim(details->>'schedule'),'') is null
   or nullif(details->>'birthDate','') is null or (details->>'birthDate')::date>current_date
   or not exists(select 1 from pg_timezone_names where name=zone) then raise exception using errcode='22023',message='INVALID_PROFILE'; end if;
  own_path:=nullif(details->>'photo','');
  if own_path is not null and split_part(own_path,'/',1)<>caller::text then raise exception using errcode='42501',message='INVALID_PHOTO'; end if;
  update public.profiles set display_name=trim(details->>'name'),country=trim(details->>'country'),time_zone=zone,avatar_path=own_path,updated_at=now() where id=caller;
  update public.student_profiles set birth_date=(details->>'birthDate')::date,learning_goal=trim(details->>'goal'),preferred_schedule=trim(details->>'schedule') where user_id=caller;

 elsif p_action in ('teacher','submit-teacher') then
  perform 1 from public.platform_settings where id for share;
  select * into tp from public.teacher_profiles where user_id=caller for update;
  if (tp.user_id is null or p_action='submit-teacher') and not (select teacher_registration_enabled from public.platform_settings where id) then raise exception using errcode='42501',message='TEACHER_REGISTRATION_CLOSED'; end if;
  if p_action='teacher' then
   details:=value->'value'; profile:=details->'publicProfile';
   own_path:=nullif(profile->>'photoUrl','');
   if own_path is not null and split_part(own_path,'/',1)<>caller::text then raise exception using errcode='42501',message='INVALID_PHOTO'; end if;
   if length(trim(coalesce(profile->>'displayName','')))=0 or jsonb_array_length(coalesce(profile->'specialties','[]'))=0
    or exists(select 1 from jsonb_array_elements_text(profile->'specialties') x where x not in ('memorization','tajweed','arabic_for_non_arabic_speakers'))
    or jsonb_array_length(coalesce(profile->'teachingLanguages','[]')) not between 1 and 10 then raise exception using errcode='22023',message='INVALID_TEACHER'; end if;
   insert into public.teacher_profiles(user_id,slug,display_name,country,specialties,teaching_languages,biography,approach,introduction,display_name_localized,experience,avatar_path,video_url)
   values(caller,'teacher-'||caller::text,trim(profile->>'displayName'),trim(details->>'country'),array(select jsonb_array_elements_text(profile->'specialties')),
    array(select jsonb_array_elements_text(profile->'teachingLanguages')),coalesce(profile->'biography','{}'),coalesce(profile->'approach','{}'),coalesce(profile->'introduction','{}'),coalesce(profile->'displayNameLocalized','{}'),
    (details->>'experience')::int,own_path,nullif(profile->>'introductionVideoUrl',''))
   on conflict(user_id) do update set display_name=excluded.display_name,country=excluded.country,specialties=excluded.specialties,teaching_languages=excluded.teaching_languages,
    biography=excluded.biography,approach=excluded.approach,introduction=excluded.introduction,display_name_localized=excluded.display_name_localized,experience=excluded.experience,
    avatar_path=excluded.avatar_path,video_url=excluded.video_url,updated_at=now();
   update public.teacher_profiles set gender=case when profile->>'gender'='female' then 'female' else 'male' end where user_id=caller;
   insert into public.teacher_private_contacts(teacher_id,phone) values(caller,coalesce(details->>'phone','')) on conflict(teacher_id) do update set phone=excluded.phone;
   insert into public.teacher_offers(teacher_id,pricing,price_cents,duration_minutes,monthly_price_cents,monthly_lessons)
   values(caller,details->>'pricing',nullif((profile->>'sessionPriceCents')::int,0),(profile->>'sessionDurationMinutes')::int,nullif((details->>'monthlyPriceCents')::int,0),(details->>'monthlyLessons')::int)
   on conflict(teacher_id) do update set pricing=excluded.pricing,price_cents=excluded.price_cents,duration_minutes=excluded.duration_minutes,monthly_price_cents=excluded.monthly_price_cents,monthly_lessons=excluded.monthly_lessons,updated_at=now();
   delete from public.teacher_qualifications where teacher_id=caller;
   for item in select * from jsonb_array_elements(coalesce(profile->'qualifications','[]')) loop
    insert into public.teacher_qualifications(teacher_id,description) values(caller,item);
   end loop;
  else
   if tp.user_id is null or tp.approval='approved' or tp.display_name='' or cardinality(tp.specialties)=0 or tp.biography='{}' or tp.approach='{}' then raise exception using errcode='22023',message='INCOMPLETE_TEACHER'; end if;
   update public.teacher_profiles set approval='pending',updated_at=now() where user_id=caller;
   insert into public.teacher_approval_events(teacher_id,actor_id,status) values(caller,caller,'pending');
  end if;

 elsif p_action='document' then
  own_path:=value->>'path';
  if split_part(own_path,'/',1)<>caller::text or not exists(select 1 from public.teacher_profiles where user_id=caller) or not exists(select 1 from storage.objects where bucket_id='tilawa-teacher-documents' and name=own_path) then raise exception using errcode='42501',message='INVALID_DOCUMENT'; end if;
  insert into public.teacher_documents(teacher_id,path,label) values(caller,own_path,left(value->>'label',200));

 elsif p_action='availability' then
  if not exists(select 1 from public.teacher_profiles where user_id=caller) then raise exception using errcode='42501',message='TEACHER_REQUIRED'; end if;
  perform private.tilawa_schedule_lock(caller,caller);
  zone:=value->>'zone';
  if not exists(select 1 from pg_timezone_names where name=zone) or jsonb_typeof(value->'value')<>'array' or jsonb_array_length(value->'value')>100 then raise exception using errcode='22023',message='INVALID_AVAILABILITY'; end if;
  for item in select * from jsonb_array_elements(value->'value') loop
   if (item->>'day')::int not between 0 and 6 or (item->>'start')::time >= (item->>'end')::time then raise exception using errcode='22023',message='INVALID_AVAILABILITY'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(value->'value') with ordinality a(x,n),jsonb_array_elements(value->'value') with ordinality z(x,n)
   where a.n<z.n and a.x->>'day'=z.x->>'day' and (a.x->>'start')::time<(z.x->>'end')::time and (z.x->>'start')::time<(a.x->>'end')::time) then raise exception using errcode='22023',message='OVERLAPPING_SLOTS'; end if;
  update public.profiles set time_zone=zone,updated_at=now() where id=caller;
  delete from public.teacher_availability where teacher_id=caller;
  insert into public.teacher_availability(teacher_id,weekday,start_time,end_time)
  select caller,(x->>'day')::int,(x->>'start')::time,(x->>'end')::time from jsonb_array_elements(value->'value') x;

 elsif p_action='book' then
  target:=(value->>'teacherId')::uuid; at_time:=(value->>'scheduledAt')::timestamptz;
  op:=value->>'lessonType'; category:=value->>'subject';
  if target=caller or category not in ('arabic','quran') then raise exception using errcode='22023',message='INVALID_BOOKING'; end if;
  select * into tp from public.teacher_profiles where user_id=target;
  if tp.approval is distinct from 'approved' or (category='arabic' and not 'arabic_for_non_arabic_speakers'=any(tp.specialties)) or (category='quran' and not (tp.specialties && array['tajweed','memorization'])) then raise exception using errcode='42501',message='TEACHER_NOT_ELIGIBLE'; end if;
  if not exists(select 1 from public.student_profiles s join public.profiles p on p.id=s.user_id where s.user_id=caller and s.birth_date is not null and p.display_name<>'' and s.learning_goal<>'') then raise exception using errcode='22023',message='COMPLETE_STUDENT_PROFILE'; end if;
  select * into offer from public.teacher_offers where teacher_id=target;
  if nullif(value->>'subscriptionId','') is not null then
   select * into sub from public.student_subscriptions where id=(value->>'subscriptionId')::uuid and student_id=caller for update;
   bucket:=coalesce(value->>'bucket','regular');
   if sub.id is null or sub.status<>'active' or sub.access_ends_at<=now() or at_time>=sub.access_ends_at or bucket not in ('regular','gift')
    or (sub.kind='teacher' and (sub.teacher_id<>target or bucket='gift')) or (sub.kind='academy' and not tp.academy_enabled)
    or (bucket='regular' and sub.subject<>category) or (bucket='gift' and (category<>'quran' or sub.gift_lessons=0 or sub.gift_type is null))
    or op<>'follow_up' then raise exception using errcode='22023',message='SUBSCRIPTION_NOT_AVAILABLE'; end if;
   select coalesce(sum(delta),0) into balance from public.subscription_credit_ledger where subscription_id=sub.id and public.subscription_credit_ledger.bucket=coalesce(value->>'bucket','regular');
   if balance<1 then raise exception using errcode='22023',message='NO_LESSON_CREDITS'; end if;
   minutes:=sub.duration_minutes; cents:=0; source:=case when sub.kind='academy' then 'academy_credit' else 'teacher_subscription' end;
  elsif op='intro' then
   minutes:=case when offer.duration_minutes>35 then offer.duration_minutes-15 else offer.duration_minutes end; cents:=0; source:='free_intro';
   perform private.tilawa_schedule_lock(target,caller);
   if exists(select 1 from public.lessons where teacher_id=target and student_id=caller and lesson_type='intro' and status in ('scheduled','completed'))
    or exists(select 1 from public.booking_requests where teacher_id=target and student_id=caller and lesson_type='intro' and status in ('pending','accepted')) then raise exception using errcode='23505',message='INTRO_ALREADY_USED'; end if;
  else
   raise exception using errcode='55000',message='PAYMENTS_NOT_CONFIGURED';
  end if;
  perform private.tilawa_assert_slot(target,caller,at_time,minutes);
  insert into public.booking_requests(student_id,teacher_id,subject,lesson_type,funding_source,subscription_id,credit_bucket,scheduled_at,duration_minutes,amount_cents,payment_status,note)
  values(caller,target,category,op,source,sub.id,bucket,at_time,minutes,cents,case when source='free_intro' then 'not_required' else 'covered' end,coalesce(value->>'note','')) returning id into record_id;
  if sub.id is not null then insert into public.subscription_credit_ledger(subscription_id,booking_id,bucket,operation,delta,event_key) values(sub.id,record_id,bucket,'reserve',-1,'reserve:'||record_id); end if;
  perform private.tilawa_notify(target,'booking:'||record_id,'booking-request','/dashboard/teacher/requests/'||record_id);
  result:=jsonb_build_object('id',record_id);

 elsif p_action in ('request','cancel-booking') then
  select * into b from public.booking_requests where id=(value->>'id')::uuid for update;
  if b.id is null or (p_action='request' and b.teacher_id<>caller) or (p_action='cancel-booking' and b.student_id<>caller) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  if b.status<>'pending' then raise exception using errcode='55000',message='REQUEST_ALREADY_RESOLVED'; end if;
  if p_action='cancel-booking' or not coalesce((value->>'accept')::boolean,false) then
   update public.booking_requests set status=case when p_action='cancel-booking' then 'cancelled' else 'rejected' end where id=b.id;
   perform private.tilawa_release_credit(b.id);
  else
   if not exists(select 1 from public.teacher_profiles where user_id=caller and approval='approved') or b.payment_status not in ('not_required','covered','paid') then raise exception using errcode='42501',message='REQUEST_NOT_ELIGIBLE'; end if;
   if b.funding_source='direct_payment' and not exists(select 1 from public.payment_transactions where id=b.payment_id and status='paid') then raise exception using errcode='42501',message='PAYMENT_REQUIRED'; end if;
   if b.subscription_id is not null and not exists(select 1 from public.student_subscriptions s join public.payment_transactions p on p.id=s.payment_id where s.id=b.subscription_id and s.status='active' and s.access_ends_at>b.scheduled_at and p.status='paid') then raise exception using errcode='22023',message='SUBSCRIPTION_NOT_AVAILABLE'; end if;
   if b.funding_source='academy_credit' and not exists(select 1 from public.teacher_profiles where user_id=caller and academy_enabled) then raise exception using errcode='42501',message='TEACHER_NOT_ELIGIBLE'; end if;
   perform private.tilawa_assert_slot(b.teacher_id,b.student_id,b.scheduled_at,b.duration_minutes,b.id);
   update public.booking_requests set status='accepted' where id=b.id;
   insert into public.lessons(booking_id,student_id,teacher_id,subject,lesson_type,funding_source,subscription_id,scheduled_at,duration_minutes,payment_status)
   values(b.id,b.student_id,b.teacher_id,b.subject,b.lesson_type,b.funding_source,b.subscription_id,b.scheduled_at,b.duration_minutes,b.payment_status) returning * into l;
   insert into public.lesson_events(lesson_id,actor_id,action) values(l.id,caller,'accepted');
   result:=jsonb_build_object('id',b.id,'lessonId',l.id);
  end if;
  perform private.tilawa_notify(case when caller=b.teacher_id then b.student_id else b.teacher_id end,'booking-decision:'||b.id||':'||p_action,'booking-decision','/profile/lessons');

 elsif p_action='gift' then
  select * into sub from public.student_subscriptions where id=(value->>'id')::uuid and student_id=caller for update;
  if sub.id is null or sub.kind<>'academy' or sub.gift_lessons=0 or sub.status<>'active' or sub.access_ends_at<=now() or value->>'gift' not in ('recitation','memorization')
   or exists(select 1 from public.booking_requests where subscription_id=sub.id and credit_bucket='gift' and status in ('pending','accepted')) then raise exception using errcode='22023',message='GIFT_NOT_AVAILABLE'; end if;
  update public.student_subscriptions set gift_type=value->>'gift' where id=sub.id;

 elsif p_action='lesson' then
  select * into l from public.lessons where id=(value->>'id')::uuid for update;
  if l.id is null or caller not in (l.teacher_id,l.student_id) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  if l.status<>'scheduled' then raise exception using errcode='55000',message='LESSON_ALREADY_RESOLVED'; end if;
  select * into b from public.booking_requests where id=l.booking_id for update;
  select * into cr from public.lesson_completion_requests where lesson_id=l.id and status='pending' for update;
  select * into xr from public.lesson_cancellation_requests where lesson_id=l.id and status='pending' for update;
  op:=value->>'operation';
  if op='reschedule' then
   if cr.id is not null or xr.id is not null then raise exception using errcode='55000',message='ACTION_PENDING'; end if;
   at_time:=(value->>'at')::timestamptz;
   if l.subscription_id is not null and not exists(select 1 from public.student_subscriptions where id=l.subscription_id and status='active' and at_time<access_ends_at) then raise exception using errcode='22023',message='SUBSCRIPTION_NOT_AVAILABLE'; end if;
   perform private.tilawa_assert_slot(l.teacher_id,l.student_id,at_time,l.duration_minutes,b.id);
   update public.lessons set scheduled_at=at_time where id=l.id;
   update public.booking_requests set scheduled_at=at_time where id=b.id;
  elsif op='cancel' then
   if cr.id is not null or xr.id is not null then raise exception using errcode='55000',message='ACTION_PENDING'; end if;
   if l.funding_source='free_intro' then
    update public.lessons set status='cancelled' where id=l.id;
    update public.booking_requests set status='cancelled' where id=b.id;
   else
    insert into public.lesson_cancellation_requests(lesson_id,requester_id,note) values(l.id,caller,coalesce(value->>'note',''));
   end if;
  elsif op in ('confirm-cancellation','reject-cancellation') then
   if xr.id is null or xr.requester_id=caller then raise exception using errcode='42501',message='INVALID_RESPONDER'; end if;
   update public.lesson_cancellation_requests set status=case when op='confirm-cancellation' then 'confirmed' else 'rejected' end,responded_at=now() where id=xr.id;
   if op='confirm-cancellation' then
    update public.lessons set status='cancelled' where id=l.id;
    update public.booking_requests set status='cancelled' where id=b.id;
    perform private.tilawa_release_credit(b.id);
    update public.lesson_cancellation_requests set financial_status=case when b.subscription_id is not null then 'credit_restored' when b.funding_source='direct_payment' then 'review_pending' else 'not_required' end where id=xr.id;
   end if;
  elsif op='request-completion' then
   if caller<>l.teacher_id or l.lesson_type='intro' or now()<l.scheduled_at+make_interval(mins=>greatest(l.duration_minutes,60)) or cr.id is not null or xr.id is not null then raise exception using errcode='42501',message='COMPLETION_NOT_ELIGIBLE'; end if;
   insert into public.lesson_completion_requests(lesson_id,note) values(l.id,coalesce(value->>'note',''));
  elsif op in ('confirm-completion','reject-completion') then
   if caller<>l.student_id or cr.id is null or now()<l.scheduled_at+make_interval(mins=>greatest(l.duration_minutes,60)) then raise exception using errcode='42501',message='INVALID_RESPONDER'; end if;
   update public.lesson_completion_requests set status=case when op='confirm-completion' then 'confirmed' else 'rejected' end,responded_at=now() where id=cr.id;
   if op='confirm-completion' then
    update public.lessons set status='completed',completed_at=now() where id=l.id;
    if b.subscription_id is not null then
     insert into public.subscription_credit_ledger(subscription_id,booking_id,bucket,operation,delta,event_key) values(b.subscription_id,b.id,b.credit_bucket,'consume',0,'consume:'||b.id) on conflict(event_key) do nothing;
    end if;
   end if;
  else raise exception using errcode='22023',message='INVALID_ACTION'; end if;
  insert into public.lesson_events(lesson_id,actor_id,action) values(l.id,caller,op);
  perform private.tilawa_notify(case when caller=l.teacher_id then l.student_id else l.teacher_id end,'lesson:'||l.id||':'||p_key,'lesson-updated','/lessons/'||l.id,jsonb_build_object('operation',op));

 elsif p_action='review' then
  select * into l from public.lessons where id=(value->>'id')::uuid;
  if l.student_id is distinct from caller or l.status<>'completed' or l.lesson_type='intro' then raise exception using errcode='42501',message='REVIEW_NOT_ELIGIBLE'; end if;
  insert into public.reviews(lesson_id,student_id,teacher_id,rating,body) values(l.id,caller,l.teacher_id,(value->>'rating')::int,trim(value->>'text'));

 elsif p_action='coupon' then
  if not exists(select 1 from public.teacher_profiles where user_id=caller and approval='approved') then raise exception using errcode='42501',message='TEACHER_NOT_APPROVED'; end if;
  details:=value->'value'; record_id:=nullif(details->>'id','')::uuid;
  if record_id is not null and not exists(select 1 from public.teacher_discount_coupons where id=record_id and teacher_id=caller) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  insert into public.teacher_discount_coupons(id,teacher_id,code,percent,usage_limit,active,expires_at)
  values(coalesce(record_id,gen_random_uuid()),caller,upper(trim(details->>'code')),(details->>'percent')::int,(details->>'limit')::int,(details->>'active')::boolean,
   case when nullif(details->>'expires','') is null then null else ((details->>'expires')::date+1)::timestamp at time zone 'UTC' end)
  on conflict(id) do update set code=excluded.code,percent=excluded.percent,usage_limit=excluded.usage_limit,active=excluded.active,expires_at=excluded.expires_at;

 elsif p_action='withdrawal' then
  if not exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=caller) then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tilawa-balance:'||caller,0));
  select coalesce(sum(amount_cents),0) into balance from public.earnings_transactions where teacher_id=caller and status='available';
  balance:=balance-(select coalesce(sum(amount_cents),0) from public.withdrawal_requests where teacher_id=caller and status<>'rejected');
  cents:=(value->>'amountCents')::int;
  if cents is null or cents<=0 or cents>balance or value->>'method'<>'bank' then raise exception using errcode='22023',message='INVALID_WITHDRAWAL'; end if;
  insert into public.withdrawal_requests(teacher_id,amount_cents,method) values(caller,cents,'bank');

 elsif p_action in ('message','conversation') then
  if nullif(value->>'conversationId','') is not null then
   select * into conv from public.direct_conversations where id=(value->>'conversationId')::uuid for update;
   if conv.id is null or caller not in (conv.teacher_id,conv.student_id) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  else
   target:=(value->>'peerId')::uuid;
   if target=caller then raise exception using errcode='22023',message='INVALID_PEER'; end if;
   if exists(select 1 from public.teacher_profiles where user_id=target and approval='approved') then
    record_id:=target; target:=caller;
   elsif private.tilawa_related_student(target) then record_id:=caller;
   else raise exception using errcode='42501',message='INVALID_PEER'; end if;
   perform private.tilawa_schedule_lock(record_id,target);
   insert into public.direct_conversations(teacher_id,student_id,requested_by) values(record_id,target,caller) on conflict(teacher_id,student_id) do nothing;
   select * into conv from public.direct_conversations where teacher_id=record_id and student_id=target for update;
  end if;
  result:=jsonb_build_object('id',conv.id);
  op:=coalesce(value->>'operation','send');
  if op in ('accept','reject') then
   if conv.requested_by=caller or conv.request_status<>'pending' then raise exception using errcode='42501',message='INVALID_RESPONDER'; end if;
   update public.direct_conversations set request_status=case when op='accept' then 'accepted' else 'rejected' end where id=conv.id;
  elsif op in ('read','block','unblock') then
   insert into public.direct_conversation_user_states(conversation_id,user_id,blocked,last_read_at) values(conv.id,caller,op='block',case when op='read' then now() else null end)
   on conflict(conversation_id,user_id) do update set blocked=case when op='read' then public.direct_conversation_user_states.blocked else excluded.blocked end,last_read_at=coalesce(excluded.last_read_at,public.direct_conversation_user_states.last_read_at);
  elsif p_action='message' then
   if conv.request_status='rejected' or exists(select 1 from public.direct_conversation_user_states where conversation_id=conv.id and blocked)
    or (conv.request_status='pending' and (conv.requested_by<>caller or exists(select 1 from public.direct_messages where conversation_id=conv.id))) then raise exception using errcode='42501',message='MESSAGE_REQUEST_PENDING_OR_BLOCKED'; end if;
   if (select count(*) from public.direct_messages where sender_id=caller and created_at>now()-interval '1 minute')>=60 then raise exception using errcode='54000',message='RATE_LIMITED'; end if;
   insert into public.direct_messages(conversation_id,sender_id,body) values(conv.id,caller,trim(value->>'text')) returning id into record_id;
   perform private.tilawa_notify(case when caller=conv.teacher_id then conv.student_id else conv.teacher_id end,'message:'||record_id,'new-message','/profile/messages?conversation='||conv.id);
  end if;

 elsif p_action='notification-read' then
  update public.notifications set read_at=now() where id=(value->>'id')::uuid and user_id=caller;

 elsif p_action in ('admin-teacher','admin-settings') then
  if not private.tilawa_is_admin() then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  if p_action='admin-settings' then
   update public.platform_settings set teacher_registration_enabled=(value->>'teacherRegistrationEnabled')::boolean where id;
  else
   target:=(value->>'id')::uuid; op:=value->>'approval';
   if target=caller or op not in ('approved','rejected') or (op='rejected' and nullif(trim(value->>'reason'),'') is null) then raise exception using errcode='22023',message='INVALID_APPROVAL'; end if;
   select * into tp from public.teacher_profiles where user_id=target for update;
   if tp.user_id is null or tp.approval='incomplete' then raise exception using errcode='22023',message='INCOMPLETE_TEACHER'; end if;
   update public.teacher_profiles set approval=op,academy_enabled=(op='approved' and coalesce((value->>'academyEnabled')::boolean,false)),updated_at=now() where user_id=target;
   insert into public.teacher_approval_events(teacher_id,actor_id,status,reason) values(target,caller,op,coalesce(value->>'reason',''));
   perform private.tilawa_notify(target,'approval:'||p_key,'teacher-approval','/profile/teacher',jsonb_build_object('status',op));
  end if;
  insert into public.admin_audit_logs(actor_id,action,target_id,details) values(caller,p_action,target,value);

 else raise exception using errcode='22023',message='INVALID_ACTION'; end if;
 insert into private.action_receipts(user_id,request_key,action,payload,result) values(caller,p_key,p_action,value,result);
 return result;
end $$;
notify pgrst,'reload schema';
commit;
