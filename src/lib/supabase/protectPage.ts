/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { GetServerSideProps } from 'next';

import { serverSupabase } from './server';

import { withLocalePrefix } from '@/utils/tilawaRoutes';

// Page protection is additional to API authorization and database RLS.
export const protectAccountPage: GetServerSideProps = async ({ req, res, resolvedUrl, locale }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const client = serverSupabase(req, res);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return {
      redirect: {
        destination: withLocalePrefix(
          `/sign-in?redirectTo=${encodeURIComponent(resolvedUrl)}`,
          locale,
        ),
        permanent: false,
      },
    };
  }
  if (/\/admin(?:\/|$)/.test(resolvedUrl)) {
    const result = await client.rpc('tilawa_admin_snapshot');
    if (result.error) return { notFound: true };
  }
  if (/\/dashboard\/teacher(?:\/|$)/.test(resolvedUrl)) {
    const { data: teacher } = await client
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (!teacher) {
      return {
        redirect: { destination: withLocalePrefix('/profile/teacher', locale), permanent: false },
      };
    }
  }
  return { props: {} };
};
