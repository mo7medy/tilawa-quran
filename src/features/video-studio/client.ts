/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
export class StudioClientError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export const studioRequest = async <T>(
  path: string,
  body?: unknown,
  method?: string,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(`/api/video-studio/${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new StudioClientError(data.error?.code ?? 'STUDIO_ERROR');
  return data as T;
};
export const errorCode = (error: unknown): string =>
  error instanceof StudioClientError ? error.code : 'NETWORK_ERROR';
