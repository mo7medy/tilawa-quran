/* eslint-disable @typescript-eslint/naming-convention -- OAuth protocol field names and headers. */
import { getQuranFoundationConfig, QuranFoundationError } from './config';
import rejectFoundationRedirect from './redirects';

export type QuranFoundationScope = 'content' | 'search';

interface CachedToken {
  value: string;
  expiresAt: number;
}

const tokens = new Map<string, CachedToken>();
const pendingTokens = new Map<string, Promise<CachedToken>>();

const requestToken = async (scope: QuranFoundationScope): Promise<CachedToken> => {
  const config = getQuranFoundationConfig();
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
        'base64',
      )}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }).toString(),
    signal: AbortSignal.timeout(15000),
    redirect: 'manual',
    cache: 'no-store',
  });
  await rejectFoundationRedirect(response, 'token endpoint');
  if (!response.ok) {
    throw new QuranFoundationError(
      `Quran Foundation token request failed (${response.status}). Check credentials, environment and ${scope} permission.`,
    );
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (
    !body.access_token ||
    !Number.isFinite(Number(body.expires_in)) ||
    Number(body.expires_in) <= 0
  ) {
    throw new QuranFoundationError('Quran Foundation returned an invalid token response.');
  }
  return { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 };
};

export const getAccessToken = async (scope: QuranFoundationScope): Promise<string> => {
  const config = getQuranFoundationConfig();
  const key = `${config.tokenUrl}:${config.clientId}:${scope}`;
  const cached = tokens.get(key);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.value;
  }
  let pending = pendingTokens.get(key);
  if (!pending) {
    pending = requestToken(scope);
    pendingTokens.set(key, pending);
  }
  try {
    const token = await pending;
    tokens.set(key, token);
    return token.value;
  } finally {
    if (pendingTokens.get(key) === pending) {
      pendingTokens.delete(key);
    }
  }
};

export const invalidateAccessToken = (scope: QuranFoundationScope, rejectedToken: string): void => {
  const config = getQuranFoundationConfig();
  const key = `${config.tokenUrl}:${config.clientId}:${scope}`;
  if (tokens.get(key)?.value === rejectedToken) {
    tokens.delete(key);
  }
};
