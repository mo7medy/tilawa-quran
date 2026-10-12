export interface QuranFoundationConfig {
  clientId: string;
  clientSecret: string;
  apiOrigin: string;
  tokenUrl: string;
}

export class QuranFoundationError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = 'QuranFoundationError';
  }
}

export const hasQuranFoundationCredentials = (): boolean =>
  Boolean(process.env.QURAN_CLIENT_ID?.trim() && process.env.QURAN_CLIENT_SECRET?.trim());

export const getQuranFoundationConfig = (): QuranFoundationConfig => {
  if (typeof window !== 'undefined') {
    throw new QuranFoundationError('Quran Foundation credentials are server-only.', 500);
  }
  if (!hasQuranFoundationCredentials()) {
    throw new QuranFoundationError(
      'Set QURAN_CLIENT_ID and QURAN_CLIENT_SECRET in the deployment environment.',
      503,
    );
  }
  const environment = process.env.QURAN_API_ENV || 'production';
  if (!['production', 'prelive'].includes(environment)) {
    throw new QuranFoundationError('QURAN_API_ENV must be production or prelive.', 503);
  }
  const prelive = environment === 'prelive';
  return {
    clientId: process.env.QURAN_CLIENT_ID.trim(),
    clientSecret: process.env.QURAN_CLIENT_SECRET.trim(),
    apiOrigin: prelive ? 'https://apis-prelive.quran.foundation' : 'https://apis.quran.foundation',
    tokenUrl: prelive
      ? 'https://prelive-oauth2.quran.foundation/oauth2/token'
      : 'https://oauth2.quran.foundation/oauth2/token',
  };
};
