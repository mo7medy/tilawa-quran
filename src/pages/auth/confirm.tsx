/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import type { EmailOtpType } from '@supabase/supabase-js';
import type { GetServerSideProps } from 'next';

import { serverSupabase } from '@/lib/supabase/server';
import { safeAccountRedirect } from '@/tilawa/backend/redirect';

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const client = serverSupabase(req, res);
  const allowed = ['email', 'signup', 'recovery', 'email_change'];
  const type =
    typeof query.type === 'string' && allowed.includes(query.type)
      ? (query.type as EmailOtpType)
      : null;
  const token = typeof query.token_hash === 'string' ? query.token_hash : '';
  const code = typeof query.code === 'string' ? query.code : '';
  const { error } = code
    ? await client.auth.exchangeCodeForSession(code)
    : type && token
    ? await client.auth.verifyOtp({ type, token_hash: token })
    : { error: true };
  return {
    redirect: {
      destination: error
        ? '/sign-in?authError=1'
        : type === 'recovery'
        ? '/sign-in?reset=1'
        : safeAccountRedirect(query.next),
      permanent: false,
    },
  };
};
export default function Confirm(): null {
  return null;
}
