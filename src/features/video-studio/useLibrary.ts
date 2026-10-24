import { useCallback, useEffect, useRef, useState } from 'react';

import { errorCode, studioRequest } from './client';
import { StudioProject, VideoRenderJob } from './contracts';

const useLibrary = (scope?: string) => {
  const current = useRef(scope);
  current.current = scope;
  const [data, setData] = useState<{
    scope: string;
    projects: StudioProject[];
    jobs: VideoRenderJob[];
  }>({ scope: '', projects: [], jobs: [] });
  const [error, setError] = useState('');
  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!scope) return;
      try {
        const [projects, jobs] = await Promise.all([
          studioRequest<StudioProject[]>('projects', undefined, 'GET', signal),
          studioRequest<VideoRenderJob[]>('jobs', undefined, 'GET', signal),
        ]);
        if (scope === current.current && !signal?.aborted) {
          setData({ scope, projects, jobs });
          setError('');
        }
      } catch (e) {
        if (scope === current.current && !signal?.aborted) setError(errorCode(e));
      }
    },
    [scope],
  );
  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal);
    const timer = window.setInterval(() => load(abort.signal), 5000);
    return () => {
      abort.abort();
      window.clearInterval(timer);
    };
  }, [load]);
  const action = async (fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
      await load();
    } catch (e) {
      if (scope === current.current) setError(errorCode(e));
    }
  };
  // Clear private data synchronously on an account change, before effects run.
  return {
    projects: data.scope === scope ? data.projects : [],
    jobs: data.scope === scope ? data.jobs : [],
    error,
    action,
  };
};
export default useLibrary;
