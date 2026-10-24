import { useEffect, useState } from 'react';

import { errorCode, studioRequest } from './client';
import { VideoRenderJob } from './contracts';

const useRenderJob = (refresh: () => Promise<void>, onComplete: () => void, projectId?: string) => {
  const [job, setJob] = useState<VideoRenderJob | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!projectId) return undefined;
    const abort = new AbortController();
    studioRequest<VideoRenderJob[]>('jobs', undefined, 'GET', abort.signal)
      .then((jobs) => {
        if (!abort.signal.aborted) setJob(jobs.find((j) => j.projectId === projectId) ?? null);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorCode(e));
      });
    return () => abort.abort();
  }, [projectId]);
  useEffect(() => {
    if (!job || ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      studioRequest<VideoRenderJob>(`jobs/${job.id}`)
        .then((next) => {
          setJob(next);
          if (['completed', 'failed', 'cancelled'].includes(next.status)) {
            refresh();
            onComplete();
          }
        })
        .catch((e) => setError(errorCode(e)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [job, refresh, onComplete]);

  return { job, setJob, error };
};
export default useRenderJob;
