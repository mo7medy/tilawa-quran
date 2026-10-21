import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/router';

import { getBrowserSupabase } from '@/lib/supabase/browser';
import { authCallbackPath, authDestination } from '@/tilawa/backend/authDestination';
import {
  CONFIRMATION_COOLDOWN,
  readPendingConfirmation,
  savePendingConfirmation,
} from '@/tilawa/backend/pendingConfirmation';

const useEmailConfirmation = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<'sent' | 'failed' | 'rate-limited' | null>(null);
  const pending = useRef(false);
  useEffect(() => {
    const saved = readPendingConfirmation();
    if (saved) {
      setEmail(saved.email);
      setDeadline(saved.sentAt + CONFIRMATION_COOLDOWN * 1000);
    }
  }, []);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const resend = async (): Promise<void> => {
    if (pending.current || Date.now() < deadline) return;
    pending.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const saved = readPendingConfirmation();
      const next = authDestination(router.query.next ?? saved?.next, router.locale);
      const { error } = await getBrowserSupabase().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${authCallbackPath(next, router.locale)}`,
        },
      });
      if (error) {
        if (error.status === 429) {
          setFeedback('rate-limited');
          setDeadline(Date.now() + CONFIRMATION_COOLDOWN * 1000);
        } else setFeedback('failed');
      } else {
        savePendingConfirmation(email.trim(), next);
        setDeadline(Date.now() + CONFIRMATION_COOLDOWN * 1000);
        setFeedback('sent');
      }
    } catch {
      setFeedback('failed');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { email, setEmail, remaining, busy, feedback, resend };
};

export default useEmailConfirmation;
