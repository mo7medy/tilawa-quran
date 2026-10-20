begin;
-- Reject stale AAL2 tokens after the last factor or the Auth session is removed.
create or replace function private.tilawa_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select private.tilawa_admin_member()
 and coalesce((select auth.jwt())->>'aal','')='aal2'
 and exists(select 1 from auth.sessions s where s.id=nullif((select auth.jwt())->>'session_id','')::uuid
  and s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now()))
 and exists(select 1 from auth.mfa_factors f where f.user_id=(select auth.uid()) and f.status='verified' and f.factor_type='totp')
$$;
notify pgrst,'reload schema';
commit;
