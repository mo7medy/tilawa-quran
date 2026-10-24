import { useCallback, useEffect, useRef, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { errorCode, studioRequest } from './client';
import {
  defaultSpec,
  ResolvedVideoManifest,
  StudioCatalog,
  StudioProject,
  VideoProjectSpec,
  VideoRenderJob,
} from './contracts';
import useRenderJob from './useRenderJob';
import { StudioSession } from './useStudioSession';

export interface EditorProps {
  session: StudioSession;
  projectId?: string;
  refresh: () => Promise<void>;
}
const useEditor = ({ session, projectId, refresh }: EditorProps) => {
  const idempotency = useRef<string>();
  const { t, lang } = useTranslation('video-studio');
  const [spec, setSpec] = useState(defaultSpec);
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [resolved, setResolved] = useState<{
    manifest: ResolvedVideoManifest;
    hash: string;
  } | null>(null);
  const clearRequest = useCallback(() => {
    idempotency.current = undefined;
  }, []);
  const { job, setJob, error: pollError } = useRenderJob(refresh, clearRequest, projectId);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [challengeKey, setChallengeKey] = useState(0);
  const [guestProject, setGuestProject] = useState('');
  const consume = (): void => {
    setChallenge('');
    setChallengeKey((k) => k + 1);
  };
  const change = (patch: Partial<VideoProjectSpec>): void => {
    setSpec((s) => ({ ...s, ...patch }));
    setResolved(null);
    setReady(false);
    setSaved(false);
    setError('');
    idempotency.current = undefined;
  };
  const onReady = useCallback((valid: boolean, code?: string): void => {
    setReady(valid);
    if (code) setError(code);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    studioRequest<StudioCatalog>(`catalog?lang=${lang}`, undefined, 'GET', abort.signal)
      .then(setCatalog)
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorCode(e));
      });
    if (projectId) {
      studioRequest<StudioProject>(`projects/${projectId}`, undefined, 'GET', abort.signal)
        .then((p) => {
          setProject(p);
          setSpec(p.spec);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(errorCode(e));
        });
    }
    if (session.registered) {
      setGuestProject(localStorage.getItem('tilawa-studio-guest-project') ?? '');
    }
    return () => abort.abort();
  }, [projectId, lang, session.registered]);
  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async (): Promise<StudioProject> => {
    const p = await studioRequest<StudioProject>(
      project ? `projects/${project.id}` : 'projects',
      { spec },
      project ? 'PUT' : 'POST',
    );
    setProject(p);
    setSaved(true);
    if (!session.registered) localStorage.setItem('tilawa-studio-guest-project', p.id);
    return p;
  };
  const generate = async (): Promise<void> => {
    const p = await save();
    idempotency.current ??= crypto.randomUUID();
    try {
      setJob(
        await studioRequest<VideoRenderJob>('jobs', {
          projectId: p.id,
          hash: resolved.hash,
          idempotency: idempotency.current,
          challenge,
        }),
      );
      await refresh();
    } finally {
      consume();
    }
  };
  return {
    setChallenge,
    spec,
    catalog,
    project,
    resolved,
    job,
    error: error || pollError,
    ready,
    busy,
    saved,
    challenge,
    challengeKey,
    guestProject,
    consume,
    change,
    onReady,
    run,
    save,
    generate,
    setReady,
    setResolved,
    setProject,
    setSpec,
    setGuestProject,
    setJob,
    setError,
    t,
    lang,
  };
};
export type EditorState = ReturnType<typeof useEditor>;
export default useEditor;
