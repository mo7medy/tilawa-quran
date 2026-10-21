import { authCallbackPath } from './authDestination';

import { getBrowserSupabase } from '@/lib/supabase/browser';

const updateAccountSecurity = (mode: 'email' | 'password', values: FormData, locale: string) =>
  getBrowserSupabase().auth.updateUser(
    mode === 'email'
      ? { email: String(values.get('email')) }
      : { password: String(values.get('password')) },
    mode === 'email'
      ? {
          emailRedirectTo: `${window.location.origin}${authCallbackPath(
            '/profile/settings',
            locale,
          )}`,
        }
      : undefined,
  );

export default updateAccountSecurity;
