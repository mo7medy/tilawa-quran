/* eslint-disable @typescript-eslint/naming-convention -- External API uses snake_case and hyphenated headers. */
/* eslint-disable import/prefer-default-export */
import { getQuranFoundationConfig, QuranFoundationError } from './config';
import { getAccessToken, invalidateAccessToken } from './oauth';
import rejectFoundationRedirect from './redirects';
import { adaptFoundationResponse, FoundationBody } from './response';
import { FoundationRoute, mapFoundationRoute } from './routes';

const requestPage = async (route: FoundationRoute): Promise<Response> => {
  const config = getQuranFoundationConfig();
  const url = new URL(route.path, config.apiOrigin);
  url.search = route.query.toString();
  const send = async (token: string): Promise<Response> => {
    const response = await fetch(url.toString(), {
      headers: {
        'x-client-id': config.clientId,
        'x-auth-token': token,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
      cache: 'no-store',
    });
    await rejectFoundationRedirect(response, 'API');
    return response;
  };
  const token = await getAccessToken(route.scope);
  const response = await send(token);
  if (response.status !== 401) {
    return response;
  }
  await response.body?.cancel();
  invalidateAccessToken(route.scope, token);
  return send(await getAccessToken(route.scope));
};

// eslint-disable-next-line react-func/max-lines-per-function
const collectVersePages = async (
  body: FoundationBody,
  route: FoundationRoute,
): Promise<FoundationBody> => {
  const verses = [...(body.verses || [])];
  let nextPage = body.pagination?.next_page;
  const visited = new Set<number>([Number(route.query.get('page') || 1)]);
  while (nextPage) {
    if (visited.has(nextPage) || visited.size >= 16) {
      throw new QuranFoundationError('Invalid or excessive Quran Foundation verse pagination.');
    }
    visited.add(nextPage);
    route.query.set('page', String(nextPage));
    // Pagination supplies the next page, so requests must be sequential.
    // eslint-disable-next-line no-await-in-loop
    const response = await requestPage(route);
    if (!response.ok) {
      throw new QuranFoundationError(
        `Quran Foundation verse pagination failed (${response.status}).`,
      );
    }
    // eslint-disable-next-line no-await-in-loop
    const page = (await response.json()) as FoundationBody;
    verses.push(...(page.verses || []));
    nextPage = page.pagination?.next_page;
  }
  return {
    ...body,
    verses,
    pagination: {
      ...body.pagination,
      current_page: 1,
      next_page: null,
      total_pages: 1,
      per_page: verses.length,
      total_records: verses.length,
    },
  };
};

export const fetchQuranFoundation = async (servicePath: string): Promise<Response> => {
  const route = mapFoundationRoute(servicePath);
  const response = await requestPage(route);
  if (!response.ok) {
    return Response.json(
      { error: `Quran Foundation API request failed (${response.status}).` },
      { status: response.status },
    );
  }
  let body = (await response.json()) as FoundationBody;
  if (route.allVerses) {
    body = await collectVersePages(body, route);
  }
  return Response.json(adaptFoundationResponse(body, route));
};
