/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import useSWR from 'swr';

import { AccountContext } from './AccountContext';
import type { LiveAction } from './AccountContext';
import { useLiveSession } from './useLiveSession';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import type { PreviewAction } from '@/tilawa/account/types';
import { sendCommand, tilawaFetch, TilawaRequestError } from '@/tilawa/backend/http';
import { emptyAccount, mapAccountSnapshot, object } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';
import { uploadDataPhoto } from '@/tilawa/backend/uploadProfilePhoto';

const LiveAccountProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const { user, authLoading } = useLiveSession(setOperationError);
  const {
    data,
    error,
    mutate: refresh,
  } = useSWR<Row>(user ? ['tilawa-account', user.id] : null, () => tilawaFetch<Row>('account'), {
    shouldRetryOnError: (failure) => failure?.status !== 401,
  });
  const state = useMemo(() => (data ? mapAccountSnapshot(data) : emptyAccount()), [data]);
  useEffect(() => {
    if (!user) return undefined;
    const client = getBrowserSupabase();
    const channel = client.channel(`account-${user.id}`);
    [
      'direct_conversations',
      'direct_messages',
      'notifications',
      'booking_requests',
      'lessons',
    ].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        refresh();
      });
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refresh();
    });
    return () => {
      client.removeChannel(channel);
    };
  }, [user, refresh]);
  const command = useCallback(
    async <T,>(action: string, payload: unknown): Promise<T> => {
      setBusy(true);
      setOperationError('');
      try {
        const result = await sendCommand<T>(action, payload, user?.id);
        await refresh();
        return result;
      } catch (failure) {
        setOperationError(failure instanceof TilawaRequestError ? failure.code : 'BACKEND_ERROR');
        throw failure;
      } finally {
        setBusy(false);
      }
    },
    [refresh, user?.id],
  );
  const dispatch = useCallback(
    async (action: PreviewAction | LiveAction): Promise<boolean> => {
      try {
        if (['reset', 'scenario'].includes(action.type)) throw new Error('PREVIEW_DISABLED');
        let payload: Row = { ...action };
        if (
          action.type === 'coupon' &&
          !state.coupons.some((coupon) => coupon.id === object(action.value).id)
        ) {
          const draft = { ...object(action.value) };
          delete draft.id;
          payload = { ...action, value: draft };
        }
        if (action.type === 'student' || action.type === 'teacher') {
          const draft = object(action.value);
          const profile = object(draft.publicProfile);
          const photo = String(
            action.type === 'student' ? draft.photo ?? '' : profile.photoUrl ?? '',
          );
          const oldPath =
            action.type === 'student' ? state.student.avatarPath : state.teacher.avatarPath;
          const path = photo.startsWith('data:')
            ? await uploadDataPhoto(photo, user?.id ?? '')
            : oldPath ?? '';
          payload = {
            ...action,
            value:
              action.type === 'student'
                ? { ...draft, photo: path }
                : { ...draft, publicProfile: { ...profile, photoUrl: path } },
          };
        }
        await command(action.type, payload);
        return true;
      } catch {
        return false;
      }
    },
    [command, state.student.avatarPath, state.teacher.avatarPath, state.coupons, user?.id],
  );
  const logout = useCallback(async (): Promise<void> => {
    await getBrowserSupabase().auth.signOut();
  }, []);
  const value = useMemo(
    () => ({
      state,
      dispatch,
      backend: true,
      loading: authLoading || (!!user && !data && !error),
      busy,
      error:
        operationError ||
        (error instanceof TilawaRequestError ? error.code : error ? 'BACKEND_ERROR' : ''),
      userId: user?.id,
      snapshot: data,
      refresh,
      command,
      logout,
    }),
    [
      state,
      dispatch,
      authLoading,
      user,
      data,
      error,
      busy,
      operationError,
      refresh,
      command,
      logout,
    ],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
export default LiveAccountProvider;
