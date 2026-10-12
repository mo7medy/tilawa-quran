import { QuranFoundationError } from './config';
import type { QuranFoundationScope } from './oauth';

export interface FoundationRoute {
  path: string;
  query: URLSearchParams;
  scope: QuranFoundationScope;
  allVerses: boolean;
  responseKind?: 'reciters' | 'reciter' | 'audioFile' | 'translations';
  resourceId?: string;
}

export const getFoundationServicePath = (input: string): string | null => {
  const url = new URL(input, 'http://localhost');
  const proxy = '/api/proxy/';
  if (url.pathname.startsWith(proxy)) {
    return `${url.pathname.slice(proxy.length)}${url.search}`;
  }
  // Build-time requests in the original app address the gateway directly.
  const match = url.pathname.match(/^\/(content|search)\//);
  return match ? `${url.pathname.slice(1)}${url.search}` : null;
};

// eslint-disable-next-line react-func/max-lines-per-function
export const mapFoundationRoute = (servicePath: string): FoundationRoute => {
  const url = new URL(`/${servicePath}`, 'https://apis.quran.foundation');
  const decodedPath = decodeURIComponent(servicePath.split('?')[0]);
  if (
    decodedPath.split('/').some((part) => part === '.' || part === '..') ||
    decodedPath.includes('\\')
  ) {
    throw new QuranFoundationError('Invalid Quran Foundation API path.', 400);
  }
  const query = new URLSearchParams(url.search);
  // Next.js/Vercel route parameters must not become upstream query parameters.
  query.delete('nxtPpath');
  if (url.pathname === '/search/v1/search' || url.pathname === '/search/api/v1/search') {
    return { path: '/search/api/v1/search', query, scope: 'search', allVerses: false };
  }
  if (!/^\/content\/api\/(qdc|v4)\//.test(url.pathname)) {
    throw new QuranFoundationError(
      'This service requires a separate user-login or Quran Reflect integration.',
      503,
    );
  }
  let path = url.pathname.replace('/content/api/qdc/', '/content/api/v4/');
  const route: FoundationRoute = { path, query, scope: 'content', allVerses: false };
  if (query.has('locale') && !query.has('language')) {
    query.set('language', query.get('locale'));
  }
  if (query.has('word_translation_language')) {
    query.set('language', query.get('word_translation_language'));
  }
  ['fields', 'word_fields'].forEach((fieldKey) => {
    if (query.has(fieldKey)) {
      query.set(fieldKey, query.get(fieldKey).replace(/\bqpc_uthmani_hafs\b/g, 'text_qpc_hafs'));
    }
  });
  if (
    path === '/content/api/v4/audio/reciters' ||
    /^\/content\/api\/v4\/audio\/reciters\/\d+$/.test(path)
  ) {
    route.resourceId = path.split('/')[6];
    route.responseKind = route.resourceId ? 'reciter' : 'reciters';
    path = '/content/api/v4/resources/chapter_reciters';
  }
  const audioFile = path.match(/^\/content\/api\/v4\/audio\/reciters\/(\d+)\/audio_files$/);
  if (audioFile) {
    const chapter = query.get('chapter');
    if (!chapter || !/^\d+$/.test(chapter)) {
      throw new QuranFoundationError('A chapter number is required for chapter audio.', 400);
    }
    path = `/content/api/v4/chapter_recitations/${audioFile[1]}/${chapter}`;
    query.delete('chapter');
    route.responseKind = 'audioFile';
  }
  if (path === '/content/api/v4/resources/translations/filter') {
    path = '/content/api/v4/resources/translations';
    route.responseKind = 'translations';
  }
  // v4 accepts numeric pagination; the reader requests all verses of a Mushaf page.
  if (path.startsWith('/content/api/v4/verses/') && query.get('per_page') === 'all') {
    query.set('per_page', '50');
    route.allVerses = true;
  }
  if (
    /^\/content\/api\/v4\/verses\/by_chapter\/\d+$/.test(path) &&
    query.has('from') &&
    query.has('to')
  ) {
    path = '/content/api/v4/verses/by_range';
  }
  route.path = path;
  return route;
};
