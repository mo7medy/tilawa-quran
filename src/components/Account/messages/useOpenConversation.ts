import { useEffect, useRef, useState } from 'react';

import { useAccountUi } from '../useAccountUi';

const watchOpening = (
  promise: Promise<{ id: string }>,
  onOpen: (id: string) => Promise<unknown>,
  onFailed: () => void,
  onDone: () => void,
): (() => void) => {
  let active = true;
  promise
    .then((result) => (active ? onOpen(result.id) : undefined))
    .catch(() => {
      if (active) onFailed();
    })
    .finally(() => {
      if (active) onDone();
    });
  return () => {
    active = false;
  };
};

const useOpenConversation = () => {
  const { router, command } = useAccountUi();
  const peer = typeof router.query.peer === 'string' ? router.query.peer : '';
  const request = useRef<{ peer: string; promise: Promise<{ id: string }> }>();
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const { replace } = router;
  useEffect(() => {
    if (!peer) {
      request.current = undefined;
      setOpening(false);
      setFailed(false);
      return undefined;
    }
    if (!command) return undefined;
    setOpening(true);
    setFailed(false);
    if (request.current?.peer !== peer) {
      request.current = {
        peer,
        promise: command<{ id: string }>('conversation', { peerId: peer }),
      };
    }
    return watchOpening(
      request.current.promise,
      (id) => replace(`/profile/messages?conversation=${id}`, undefined, { shallow: true }),
      () => setFailed(true),
      () => setOpening(false),
    );
  }, [peer, command, replace, attempt]);
  return {
    opening: !!peer && opening,
    failed: !!peer && failed,
    retry: () => {
      request.current = undefined;
      setAttempt((value) => value + 1);
    },
  };
};

export default useOpenConversation;
