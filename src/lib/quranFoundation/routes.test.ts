// @vitest-environment node
/* eslint-disable react-func/max-lines-per-function */
import { describe, expect, it } from 'vitest';

import { getFoundationServicePath, mapFoundationRoute } from './routes';

describe('Quran Foundation route compatibility', () => {
  it('recognizes runtime and build-time content requests', () => {
    expect(
      getFoundationServicePath('https://site.test/api/proxy/content/api/qdc/pages/lookup?a=1'),
    ).toBe('content/api/qdc/pages/lookup?a=1');
    expect(getFoundationServicePath('https://gateway.test/content/api/qdc/chapters')).toBe(
      'content/api/qdc/chapters',
    );
    expect(getFoundationServicePath('https://site.test/profile')).toBeNull();
  });

  it('maps QDC content to v4 without dropping Mushaf parameters', () => {
    const route = mapFoundationRoute('content/api/qdc/pages/lookup?chapter_number=2&mushaf=19');
    expect(route.path).toBe('/content/api/v4/pages/lookup');
    expect(route.query.get('mushaf')).toBe('19');
  });

  it('maps reader ranges and all-page pagination', () => {
    const route = mapFoundationRoute(
      'content/api/qdc/verses/by_chapter/2?from=2:1&to=2:5&per_page=all',
    );
    expect(route.path).toBe('/content/api/v4/verses/by_range');
    expect(route.query.get('per_page')).toBe('50');
    expect(route.allVerses).toBe(true);
  });

  it('uses the word translation language and removes internal routing parameters', () => {
    const route = mapFoundationRoute(
      'content/api/qdc/verses/by_page/1?locale=en&word_translation_language=ar&nxtPpath=bad',
    );
    expect(route.query.get('language')).toBe('ar');
    expect(route.query.has('nxtPpath')).toBe(false);
  });

  it('requests the canonical Quran text fields for the legacy reader', () => {
    const route = mapFoundationRoute(
      'content/api/qdc/verses/by_page/2?word_fields=verse_key,qpc_uthmani_hafs',
    );
    expect(route.query.get('word_fields')).toBe('verse_key,text_qpc_hafs');
  });

  it('maps the chapter reciter list and individual profile', () => {
    expect(mapFoundationRoute('content/api/qdc/audio/reciters').path).toBe(
      '/content/api/v4/resources/chapter_reciters',
    );
    const route = mapFoundationRoute('content/api/qdc/audio/reciters/7');
    expect(route.responseKind).toBe('reciter');
    expect(route.resourceId).toBe('7');
  });

  it('maps chapter audio while retaining timing segments', () => {
    const route = mapFoundationRoute(
      'content/api/qdc/audio/reciters/7/audio_files?chapter=2&segments=true',
    );
    expect(route.path).toBe('/content/api/v4/chapter_recitations/7/2');
    expect(route.query.get('segments')).toBe('true');
  });

  it('uses a separate search scope', () => {
    const route = mapFoundationRoute('search/v1/search?mode=quick&query=mercy');
    expect(route.path).toBe('/search/api/v1/search');
    expect(route.scope).toBe('search');
  });

  it.each([
    'auth/users/me',
    'content/api/qdc/../users',
    'content/api/qdc/%2e%2e/users',
    'content/api/qdc/a\\b',
  ])('rejects unsupported or unsafe routes: %s', (path) => {
    expect(() => mapFoundationRoute(path)).toThrow();
  });
});
