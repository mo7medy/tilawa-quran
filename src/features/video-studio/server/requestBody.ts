/* eslint-disable no-await-in-loop -- Bounded streaming, cleanup and polling operations must finish sequentially before the next step. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { assert } from '../validation';

export const readBody = async (req: Request): Promise<string> => {
  assert(Number(req.headers.get('content-length') ?? 0) <= 16384, 'BODY_TOO_LARGE', 413);
  if (!req.body) return '{}';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      assert(size <= 16384, 'BODY_TOO_LARGE', 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((c) => {
    buffer.set(c, offset);
    offset += c.length;
  });
  return new TextDecoder().decode(buffer);
};
