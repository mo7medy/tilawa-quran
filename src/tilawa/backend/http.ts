/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import { getSessionUserId } from '@/lib/supabase/browser';

export class TilawaRequestError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}
export const tilawaFetch = async <T>(
  path: string,
  body?: unknown,
  expectedUser = getSessionUserId(),
): Promise<T> => {
  const response = await fetch(`/api/tilawa/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(expectedUser ? { 'X-Tilawa-User': expectedUser } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new TilawaRequestError(result.error?.code ?? 'BACKEND_ERROR', response.status);
  }
  return result.data as T;
};
export const sendCommand = async <T = { ok: boolean; id?: string }>(
  action: string,
  payload: unknown,
  expectedUser?: string,
): Promise<T> =>
  tilawaFetch<T>('command', { action, payload, requestKey: crypto.randomUUID() }, expectedUser);
