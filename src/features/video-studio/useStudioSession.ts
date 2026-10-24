import { useCallback, useEffect, useRef, useState } from 'react';

import { errorCode, studioRequest } from './client';
import { StudioQuota } from './contracts';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface StudioSession {
  scope: string;
  registered: boolean;
  quota: StudioQuota;
}
const useStudioSession = (): {
  session: StudioSession | null;
  error: string;
  refresh: () => Promise<void>;
} => {
  const [session, setSession] = useState<StudioSession | null>(null);
  const [error, setError] = useState('');
  const pending = useRef<AbortController>();
  const refresh = useCallback(async (): Promise<void> => {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    try {
      const next = await studioRequest<StudioSession>('session', undefined, 'GET', abort.signal);
      if (abort.signal.aborted) return;
      setSession(next);
      setError('');
    } catch (e) {
      if (abort.signal.aborted) return;
      setSession(null);
      setError(errorCode(e));
    }
  }, []);
  useEffect(() => {
    let live = true;
    const reload = (): void => {
      if (live) {
        setSession(null);
        refresh();
      }
    };
    reload();
    const subscription = isSupabaseConfigured()
      ? getBrowserSupabase().auth.onAuthStateChange((event) => {
          if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) queueMicrotask(reload);
        }).data.subscription
      : null;
    const focus = (): void => {
      if (live) refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      live = false;
      pending.current?.abort();
      subscription?.unsubscribe();
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  return { session, error, refresh };
};
export default useStudioSession;
