/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import { useEffect, useState } from 'react';

import type { User } from '@supabase/supabase-js';
import { useSWRConfig } from 'swr';

import { getBrowserSupabase, setSessionUserId } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { clearPrivateSwr } from '@/tilawa/backend/clearPrivateSwr';
import { switchPrivateOwner } from '@/tilawa/backend/privateCache';

export const useLiveSession = (reportError: (message: string) => void) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { mutate, cache } = useSWRConfig();
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      reportError('BACKEND_NOT_CONFIGURED');
      return undefined;
    }
    let active = true;
    let authRevision = 0;
    const client = getBrowserSupabase();
    const update = (next: User | null): void => {
      if (!active) return;
      const changed = switchPrivateOwner(next?.id ?? null);
      if (changed) {
        clearPrivateSwr(cache, (key) => {
          mutate(key, undefined, { revalidate: false });
        });
        reportError('');
      }
      setSessionUserId(next?.id ?? null);
      setUser(next);
      setAuthLoading(false);
    };
    client.auth
      .getUser()
      .then(({ data: auth }) => {
        if (authRevision === 0) update(auth.user);
      })
      .catch(() => {
        if (authRevision === 0) update(null);
      });
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      authRevision += 1;
      update(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        clearPrivateSwr(cache, (key) => {
          mutate(key, undefined, { revalidate: false });
        });
        window.dispatchEvent(new Event('tilawa-account-cleared'));
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [mutate, cache, reportError]);
  return { user, authLoading };
};
