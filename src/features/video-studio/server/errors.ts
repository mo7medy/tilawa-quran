/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { StudioError } from '../validation';

import { QuranFoundationError } from '@/lib/quranFoundation/config';

export const studioFailure = (error: unknown): { code: string; status: number } => {
  if (error instanceof StudioError) return { code: error.code, status: error.status };
  if (error instanceof SyntaxError) return { code: 'INVALID_INPUT', status: 422 };
  if (error instanceof QuranFoundationError) return { code: 'CONTENT_UNAVAILABLE', status: 503 };
  const message = error instanceof Error ? error.message : '';
  const constraint = [
    'OWNER_BUSY',
    'DAILY_LIMIT',
    'GLOBAL_LIMIT',
    'STORAGE_LIMIT',
    'CONNECTION_LIMIT',
    'DESTINATION_LIMIT',
  ].find((code) => message.includes(code));
  if (message.includes('studio_buffer_connections.owner, studio_buffer_connections.account_id')) {
    return { code: 'BUFFER_DUPLICATE', status: 409 };
  }
  if (
    message.includes(
      'studio_destinations.owner, studio_destinations.platform, studio_destinations.channel_id',
    )
  ) {
    return { code: 'BUFFER_CHANNEL_DUPLICATE', status: 409 };
  }
  if (constraint) return { code: constraint, status: 429 };
  return { code: 'STUDIO_ERROR', status: 500 };
};
