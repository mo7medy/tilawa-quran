import type { GetServerSideProps } from 'next';

import { serverSupabase } from '@/lib/supabase/server';
import { authDestination } from '@/tilawa/backend/authDestination';

export const getServerSideProps: GetServerSideProps = async ({ req, res, query, locale }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const client = serverSupabase(req, res);
  const code = typeof query.code === 'string' ? query.code : '';
  const { error } = code ? await client.auth.exchangeCodeForSession(code) : { error: true };
  return {
    redirect: {
      destination: authDestination(
        error ? '/sign-in?authError=1' : query.next,
        query.lang === 'ar' ? 'ar' : locale,
      ),
      permanent: false,
    },
  };
};
export default function Callback(): null {
  return null;
}
