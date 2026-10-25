/* eslint-disable react-func/max-lines-per-function -- One upload action covers reservation, streaming and asynchronous decoder verification. */
/* eslint-disable no-await-in-loop -- Bounded streaming, cleanup and polling operations must finish sequentially before the next step. */
import { useState } from 'react';

import { errorCode, studioRequest } from './client';
import { VideoProjectSpec } from './contracts';

export interface BackgroundUploadProps {
  spec: VideoProjectSpec;
  change: (patch: Partial<VideoProjectSpec>) => void;
  onError: (code: string) => void;
}
const useBackgroundUpload = ({ spec, change, onError }: BackgroundUploadProps) => {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const { id } = await studioRequest<{ id: string }>('uploads', {
        mime: file.type,
        size: file.size,
      });
      const response = await fetch(`/api/video-studio/uploads/${id}`, {
        method: 'PUT',
        body: file,
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('UPLOAD_FAILED');
      for (let i = 0; i < 60; i += 1) {
        const asset = await studioRequest<{ status: string }>(`uploads/${id}`);
        if (asset.status === 'ready') {
          change({ background: { ...spec.background, type: 'upload', value: id } });
          return;
        }
        if (asset.status === 'failed') throw new Error('INVALID_FILE');
        await new Promise((resolve) => {
          window.setTimeout(resolve, 2000);
        });
      }
      onError('UPLOAD_TIMEOUT');
    } catch (e) {
      const code = errorCode(e);
      if (e instanceof Error && ['INVALID_FILE', 'UPLOAD_FAILED'].includes(e.message)) {
        onError(e.message);
      } else {
        onError(code === 'NOT_FOUND' ? 'INVALID_FILE' : code);
      }
    } finally {
      setBusy(false);
    }
  };

  return { busy, upload };
};
export default useBackgroundUpload;
