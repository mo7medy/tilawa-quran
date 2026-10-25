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
  const current = useRef<StudioSession | null>(null);
  const applySession = useCallback((next: StudioSession | null): void => {
    current.current = next;
    setSession(next);
  }, []);
  const invalidateChangedOwner = useCallback(
    (scope: string | null): void => {
      const sameOwner = current.current?.registered ? current.current.scope === scope : !scope;
      if (sameOwner) return;
      // Invalidate synchronously so a response for the previous account cannot restore it.
      pending.current?.abort();
      applySession(null);
      setError('');
    },
    [applySession],
  );
  const refresh = useCallback(async (): Promise<void> => {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    try {
      const next = await studioRequest<StudioSession>('session', undefined, 'GET', abort.signal);
      if (abort.signal.aborted) return;
      applySession(next);
      setError('');
    } catch (e) {
      if (abort.signal.aborted) return;
      const code = errorCode(e);
      if (['AUTH_REQUIRED', 'FORBIDDEN'].includes(code)) applySession(null);
      setError(code);
    }
  }, [applySession]);
  useEffect(() => {
    let live = true;
    refresh();
    const subscription = isSupabaseConfigured()
      ? getBrowserSupabase().auth.onAuthStateChange((event, authSession) => {
          if (
            !live ||
            !['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)
          ) {
            return;
          }
          const nextScope = authSession?.user?.id ? `user:${authSession.user.id}` : null;
          invalidateChangedOwner(nextScope);
          // Supabase may confirm the same login again when the browser regains focus.
          // Refresh quota in the background without unmounting that owner's editor.
          queueMicrotask(() => {
            if (live) refresh();
          });
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
  }, [refresh, invalidateChangedOwner]);
  return { session, error, refresh };
};
export default useStudioSession;
