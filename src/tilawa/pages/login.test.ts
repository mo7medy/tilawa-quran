import type { GetServerSidePropsContext } from 'next';
import { describe, expect, it } from 'vitest';

import { getServerSideProps } from '../../pages/login';

describe('Legacy login route', () => {
  it.each([
    ['en', '/sign-in'],
    ['ar', '/ar/sign-in'],
    ['nl', '/nl/sign-in'],
  ])('redirects %s to the shared account page', async (locale, destination) => {
    const context = { locale, query: {} } as GetServerSidePropsContext;
    expect(await getServerSideProps(context)).toEqual({
      redirect: { destination, permanent: false },
    });
  });

  it('preserves the reader return path, package selection and auth callback parameters', async () => {
    const query = {
      r: '/ar/2?startingVerse=5#reading',
      package: 'progress',
      subject: 'quran',
      gift: 'memorization',
      error: 'AuthenticationError',
    };
    const context = { locale: 'ar', query } as unknown as GetServerSidePropsContext;
    const result = await getServerSideProps(context);
    expect(result).toHaveProperty('redirect');
    if (!('redirect' in result)) return;
    const url = new URL(result.redirect.destination, 'https://tilawa.example');
    expect(url.pathname).toBe('/ar/sign-in');
    Object.entries(query).forEach(([key, value]) => {
      expect(url.searchParams.get(key)).toBe(value);
    });
  });
});
