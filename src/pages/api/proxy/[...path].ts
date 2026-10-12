import type { NextApiRequest, NextApiResponse } from 'next';

import { fetchQuranFoundation } from '@/lib/quranFoundation/client';
import { hasQuranFoundationCredentials, QuranFoundationError } from '@/lib/quranFoundation/config';

// Next.js requires a statically analyzable route config.
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const isAllowedOrigin = (req: NextApiRequest): boolean => {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    return true; // Public, read-only Quran content also supports server-to-server requests.
  }
  try {
    const allowed = [
      req.headers.host,
      process.env.VERCEL_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
      ...(process.env.ALLOWED_ORIGINS || '').split(',').map((host) => host.trim()),
    ];
    return allowed.includes(new URL(Array.isArray(origin) ? origin[0] : origin).host);
  } catch {
    return false;
  }
};

const handleFoundationRequest = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Quran content only supports GET requests.' });
    return;
  }
  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { path } = req.query;
  if (!Array.isArray(path)) {
    res.status(400).json({ error: 'Invalid API path.' });
    return;
  }
  const { search } = new URL(req.url, 'http://localhost');
  const response = await fetchQuranFoundation(`${path.join('/')}${search}`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(response.status).json(await response.json());
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const service = Array.isArray(req.query.path) ? req.query.path[0] : '';
    if (hasQuranFoundationCredentials() && ['content', 'search'].includes(service)) {
      await handleFoundationRequest(req, res);
      return;
    }
    if (process.env.API_GATEWAY_URL?.trim()) {
      const { default: legacyProxy } = await import('@/lib/quranFoundation/legacyProxy');
      legacyProxy(req, res);
      return;
    }
    res.status(503).json({
      error:
        'Configure QURAN_CLIENT_ID and QURAN_CLIENT_SECRET for content/search. Other services need a separate integration or API_GATEWAY_URL.',
    });
  } catch (error) {
    const status = error instanceof QuranFoundationError ? error.status : 502;
    const message =
      error instanceof QuranFoundationError ? error.message : 'Quran Foundation connection failed.';
    res.status(status).json({ error: message });
  }
}
