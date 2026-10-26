/* eslint-disable react-func/max-lines-per-function -- Keep the origin, identity, dispatch and sanitized error boundary in one request lifecycle. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { assert } from '../validation';

import { studioFailure } from './errors';
import { fileRequest } from './files';
import { checkRate, ownerFor, protectOrigin } from './identity';
import { internalRequest } from './internal';
import { readBody } from './requestBody';
import { authenticated } from './routes';
import { json, studioEnv, StudioEnv } from './runtime';
// Run before OpenNext so large uploads stay streams rather than buffered Next API bodies.
export const handleStudio = async (req: Request, bindings: StudioEnv): Promise<Response> => {
  const headers = new Headers();
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    const env = studioEnv(bindings);
    const path = new URL(req.url).pathname
      .slice('/api/video-studio/'.length)
      .split('/')
      .filter(Boolean);
    if (path[0] === 'internal') {
      assert(
        req.method === 'POST' || (path[1] === 'output' && req.method === 'PUT'),
        'METHOD_NOT_ALLOWED',
        405,
      );
      response = await internalRequest(
        env,
        path.slice(1),
        req,
        path[1] === 'output' ? '' : await readBody(req),
      );
    } else if (
      ['assets', 'backgrounds', 'file', 'download', 'publication-media'].includes(path[0])
    ) {
      response = await fileRequest(env, req, path[0], path[1]);
    } else {
      protectOrigin(req, env);
      const owner = await ownerFor(req, headers, env);
      await checkRate(env, `api:${owner.network}`, 180);
      response = await authenticated(env, req, path, owner);
    }
  } catch (error) {
    const { code, status } = studioFailure(error);
    // eslint-disable-next-line no-console -- Correlation and sanitized categories only; no text, tokens or URLs.
    if (status >= 500) console.error(JSON.stringify({ event: 'studio_failure', code, requestId }));
    response = json({ error: { code, requestId } }, status);
  }
  headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') response.headers.append(key, value);
  });
  headers.getSetCookie().forEach((cookie) => response.headers.append('Set-Cookie', cookie));
  response.headers.set('X-Request-Id', requestId);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
