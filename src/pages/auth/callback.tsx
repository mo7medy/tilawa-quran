import type { GetServerSideProps } from 'next';

import { serverSupabase } from '@/lib/supabase/server';
import { safeAccountRedirect } from '@/tilawa/backend/redirect';

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const client = serverSupabase(req, res);
  const code = typeof query.code === 'string' ? query.code : '';
  const { error } = code ? await client.auth.exchangeCodeForSession(code) : { error: true };
  return {
    redirect: {
      destination: error ? '/sign-in?authError=1' : safeAccountRedirect(query.next),
      permanent: false,
    },
  };
};
export default function Callback(): null {
  return null;
}
