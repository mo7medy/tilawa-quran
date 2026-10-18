begin;
-- Teacher approval does not require access to private student records.
drop policy student_self on public.student_profiles;
create policy student_self on public.student_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy profile_self on public.profiles;
create policy profile_self on public.profiles for select to authenticated using(id=(select auth.uid()) or ((select private.tilawa_is_admin()) and exists(select 1 from public.teacher_profiles t where t.user_id=profiles.id)));
notify pgrst,'reload schema';
commit;
