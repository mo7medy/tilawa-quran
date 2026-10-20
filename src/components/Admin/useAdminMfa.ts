import { useEffect, useState } from 'react';

import { useAccountUi } from '../Account/useAccountUi';

import { getBrowserSupabase, getSessionUserId } from '@/lib/supabase/browser';

const useAdminMfa = () => {
  const { userId, refresh } = useAccountUi();
  const [factors, setFactors] = useState<{ id: string; friendlyName?: string }[]>([]);
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPending(null);
    setCode('');
    setLoaded(false);
    getBrowserSupabase()
      .auth.mfa.listFactors()
      .then(({ data, error: failure }) => {
        if (active && getSessionUserId() === userId) {
          setFactors(
            data?.totp
              .filter((f) => f.status === 'verified')
              .map((f) => ({ id: f.id, friendlyName: f.friendly_name })) ?? [],
          );
          setError(!!failure);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);
  const start = async (): Promise<void> => {
    setBusy(true);
    setError(false);
    try {
      const client = getBrowserSupabase();
      const result = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Tilawa ${new Date().toISOString()}`,
      });
      if (result.error) throw result.error;
      if (getSessionUserId() === userId) {
        setPending({
          id: result.data.id,
          qr: result.data.totp.qr_code,
          secret: result.data.totp.secret,
        });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const verify = async (): Promise<void> => {
    const factorId = pending?.id ?? factors[0]?.id;
    if (!factorId) return;
    setBusy(true);
    setError(false);
    try {
      const result = await getBrowserSupabase().auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setPending(null);
      setCode('');
      const current = await getBrowserSupabase().auth.mfa.listFactors();
      if (getSessionUserId() === userId) {
        setFactors(
          current.data?.totp
            .filter((f) => f.status === 'verified')
            .map((f) => ({ id: f.id, friendlyName: f.friendly_name })) ?? [],
        );
      }
      if (getSessionUserId() === userId) await refresh?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (factorId: string): Promise<void> => {
    setBusy(true);
    setError(false);
    try {
      const result = await getBrowserSupabase().auth.mfa.unenroll({ factorId });
      if (result.error) throw result.error;
      if (getSessionUserId() === userId) {
        const session = await getBrowserSupabase().auth.refreshSession();
        if (session.error) throw session.error;
      }
      setRemoving(null);
      setPending(null);
      setCode('');
      if (getSessionUserId() === userId) await refresh?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return {
    factors,
    pending,
    code,
    setCode,
    busy,
    error,
    loaded,
    removing,
    setRemoving,
    start,
    verify,
    remove,
    retry: () => setAttempt((current) => current + 1),
  };
};
export default useAdminMfa;
