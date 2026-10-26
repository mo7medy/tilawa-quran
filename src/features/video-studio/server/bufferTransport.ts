/* eslint-disable @typescript-eslint/naming-convention -- Provider errors and wire fields retain their documented names. */
/* eslint-disable react-func/max-lines-per-function -- Keep the bounded transport and uncertain-write classification together. */
/* eslint-disable no-restricted-syntax -- Streaming response reads are bounded to one MiB. */
/* eslint-disable no-await-in-loop -- Read the bounded response stream sequentially. */
import { assert, StudioError } from '../validation';

export class BufferFailure extends StudioError {
  constructor(code: string, public uncertain = false, public retryAfter = 0) {
    super(code, 503);
  }
}
export const bufferQuery = async <T>(
  token: string,
  document: string,
  variables = {},
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch('https://api.buffer.com', {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: document, variables }),
    });
  } catch {
    throw new BufferFailure('BUFFER_UNCERTAIN', true);
  }
  if (response.status === 429) {
    const retry = Number(response.headers.get('retry-after'));
    throw new BufferFailure(
      'BUFFER_RATE_LIMIT',
      false,
      Math.max(60000, Math.min((retry || 900) * 1000, 86400000)),
    );
  }
  if ([401, 403].includes(response.status)) throw new BufferFailure('BUFFER_RECONNECT');
  if (!response.ok) throw new BufferFailure('BUFFER_UNCERTAIN', true);
  // Bound the response while streaming; provider errors and tokens are never returned or logged.
  const reader = response.body?.getReader();
  let text = '';
  const decoder = new TextDecoder();
  try {
    assert(reader, 'BUFFER_RESPONSE', 503);
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      assert(size <= 1048576, 'BUFFER_RESPONSE', 503);
      text += decoder.decode(value, { stream: true });
    }
    const result = JSON.parse(text) as { data?: T; errors?: unknown[] };
    if (result.errors?.length || !result.data) throw new Error();
    return result.data;
  } catch {
    throw new BufferFailure('BUFFER_UNCERTAIN', true);
  } finally {
    await reader?.cancel();
  }
};
