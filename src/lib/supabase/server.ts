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
  if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
    const { origin } = req.headers;
    if (!origin || new URL(origin).host !== req.headers.host) {
      throw new BackendError('INVALID_ORIGIN', 403);
    }
  }
};
export const respondError = (res: NextApiResponse, error: unknown): void => {
  const source = error as { message?: string; code?: string; status?: number };
  const code = /^[A-Z][A-Z0-9_]+$/.test(source.message ?? '')
    ? source.message
    : source.code ?? 'BACKEND_ERROR';
  const status =
    error instanceof BackendError
      ? error.status
      : source.code === '42501'
      ? 403
      : ['23505', '23P01', '55000', '40P01'].includes(source.code)
      ? 409
      : 422;
  res.status(status).json({ error: { code } });
};
