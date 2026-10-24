/* eslint-disable react-func/max-lines-per-function -- Guest and verified-account identity resolution share the same cookie response boundary. */
import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';

import { StudioOwner } from '../contracts';
import { assert } from '../validation';

import { sign, validCapability, capability } from './crypto';
import { StudioEnv } from './runtime';

import { getSupabaseConfiguration } from '@/lib/supabase/config';

export const guestFromCookie = async (req: Request, env: StudioEnv): Promise<string | null> => {
  const cookie = parse(req.headers.get('cookie') ?? '').tilawa_studio_guest ?? '';
  const [id, token] = cookie.split('~');
  return /^[0-9a-f-]{36}$/.test(id) &&
    (await validCapability(env.STUDIO_SIGNING_SECRET, `guest:${id}`, token ?? ''))
    ? `guest:${id}`
    : null;
};
export const ownerFor = async (
  req: Request,
  headers: Headers,
  env: StudioEnv,
): Promise<StudioOwner> => {
  const network = await sign(
    env.STUDIO_SIGNING_SECRET,
    `network:${req.headers.get('cf-connecting-ip') ?? 'unknown'}`,
  );
  const cookies = req.headers.get('cookie') ?? '';
  const config = getSupabaseConfiguration();
  if (config && /(?:^|;\s*)sb-[^=]+auth-token/.test(cookies)) {
    const client = createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll: () => Object.entries(parse(cookies)).map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            headers.append('Set-Cookie', serialize(name, value, options)),
          ),
      },
    });
    const { data, error } = await client.auth.getUser();
    assert(!error && data.user, 'AUTH_REQUIRED', 401);
    return { id: `user:${data.user.id}`, registered: true, network };
  }
  const existing = await guestFromCookie(req, env);
  if (existing) return { id: existing, registered: false, network };
  const id = crypto.randomUUID();
  const value = `${id}~${await capability(
    env.STUDIO_SIGNING_SECRET,
    `guest:${id}`,
    Date.now() + 86400000,
  )}`;
  headers.append(
    'Set-Cookie',
    serialize('tilawa_studio_guest', value, {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      secure: new URL(env.STUDIO_ORIGIN).protocol === 'https:',
      sameSite: 'lax',
    }),
  );
  return { id: `guest:${id}`, registered: false, network };
};
export const protectOrigin = (req: Request, env: StudioEnv): void => {
  if (['GET', 'HEAD'].includes(req.method)) return;
  assert(req.headers.get('origin') === new URL(env.STUDIO_ORIGIN).origin, 'INVALID_ORIGIN', 403);
};
export const checkRate = async (env: StudioEnv, key: string, limit = 60): Promise<void> => {
  const now = Date.now();
  const window = Math.floor(now / 60000);
  const r = await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_rates(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(`${key}:${window}`, now + 120000)
    .first<{ count: number }>();
  assert(r.count <= limit, 'RATE_LIMIT', 429);
};
export const checkTurnstile = async (env: StudioEnv, token: unknown): Promise<void> => {
  assert(
    env.STUDIO_TURNSTILE_SECRET && typeof token === 'string' && token.length <= 2048,
    'CHALLENGE_REQUIRED',
    403,
  );
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.STUDIO_TURNSTILE_SECRET, response: token as string }),
    signal: AbortSignal.timeout(10000),
  });
  const data = (await response.json()) as { success?: boolean; hostname?: string; action?: string };
  assert(
    response.ok &&
      data.success &&
      data.hostname === new URL(env.STUDIO_ORIGIN).hostname &&
      data.action === 'video-studio',
    'CHALLENGE_FAILED',
    403,
  );
};
