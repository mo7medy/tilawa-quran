/* eslint-disable prefer-destructuring -- Read readonly exception metadata without modifying it. */
/* eslint-disable react-func/max-lines-per-function -- Central status and sanitized diagnostic mapping. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import type { IncomingMessage, ServerResponse } from 'http';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { parse, serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getSupabaseConfiguration } from './config';

export class BackendError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}
export const serverSupabase = (
  req: Pick<IncomingMessage, 'headers'>,
  res: ServerResponse,
): SupabaseClient => {
  const config = getSupabaseConfiguration();
  if (!config) throw new BackendError('BACKEND_NOT_CONFIGURED', 503);
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () =>
        Object.entries(parse(req.headers.cookie ?? '')).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        const previous = res.getHeader('Set-Cookie');
        const headers =
          typeof previous === 'string'
            ? [previous]
            : Array.isArray(previous)
            ? previous.map(String)
            : [];
        res.setHeader('Set-Cookie', [
          ...headers,
          ...cookies.map(({ name, value, options }) => serialize(name, value, options)),
        ]);
      },
    },
  });
};
export const requireUser = async (client: SupabaseClient): Promise<User> => {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new BackendError('AUTH_REQUIRED', 401);
  return data.user;
};
export const protectRequest = (req: NextApiRequest, res: NextApiResponse): void => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('X-Request-Id', crypto.randomUUID());
  if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
    const { origin } = req.headers;
    let matches = false;
    try {
      matches = !!origin && new URL(origin).host === req.headers.host;
    } catch {
      matches = false;
    }
    if (!matches) {
      throw new BackendError('INVALID_ORIGIN', 403);
    }
  }
};
export const respondError = (res: NextApiResponse, error: unknown): void => {
  const source = error as { message?: string; code?: string; status?: number };

  const expected = /^[A-Z][A-Z0-9_]+$/.test(source?.message ?? '');
  let status = 500;
  if (error instanceof BackendError) status = error.status;
  else if (source?.code === '42501') status = source.message === 'AUTH_REQUIRED' ? 401 : 403;
  else if (['23505', '23P01', '55000', '40P01'].includes(source?.code ?? '')) status = 409;
  else if (['PGRST202', '42P01', '42883'].includes(source?.code ?? '')) status = 503;
  else if (
    ['22023', '22P02', '22007', '22008', '23514', '23502'].includes(source?.code ?? '') ||
    (expected && source?.code === 'P0001')
  ) {
    status = 422;
  }
  const code =
    status < 500 && expected
      ? source.message
      : status === 503
      ? 'BACKEND_UNAVAILABLE'
      : status < 500
      ? 'INVALID_INPUT'
      : 'BACKEND_ERROR';
  const requestId = String(res.getHeader('X-Request-Id') ?? crypto.randomUUID());
  res.setHeader('X-Request-Id', requestId);
  if (status >= 500) {
    // eslint-disable-next-line no-console -- Sanitized correlation only; never raw exception data.
    console.error(
      JSON.stringify({
        event: 'tilawa_api_failure',
        requestId,
        status,
        category: /^[A-Z0-9]{5,10}$/.test(source?.code ?? '') ? source.code : 'UNEXPECTED',
      }),
    );
  }
  res.status(status).json({ error: { code, requestId } });
};
