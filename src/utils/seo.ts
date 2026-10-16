/* eslint-disable react-func/max-lines-per-function */
import { NextSeoProps } from 'next-seo';

import { getOpenGraphLocale } from './locale';
import { getBasePath } from './url';

import { VersesResponse } from 'types/ApiResponses';

export const config = {
  siteName: 'Tilawa',
};

/**
 * Default social preview image: the Tilawa app icon served from this
 * deployment (actual 499x500 PNG — dimensions declared honestly).
 * Replaces the old remote branded OG service for default page metadata.
 * Quran content/audio API endpoints are untouched.
 */
export const TILAWA_OG_IMAGE_PATH = '/tilawa/app_icon.png';
export const TILAWA_OG_IMAGE_WIDTH = 499;
export const TILAWA_OG_IMAGE_HEIGHT = 500;

/**
 * Absolute URL of the default Tilawa preview image on the current origin.
 *
 * @returns {string} absolute preview image URL
 */
export const getTilawaDefaultOgImageUrl = (): string => `${getBasePath()}${TILAWA_OG_IMAGE_PATH}`;

type SeoConfigType = {
  path?: string;
  locale?: string;
  title?: string;
  description?: string;
  canonicalUrl?: string;
};

export interface SEOProps extends NextSeoProps {
  dangerouslySetAllPagesToNoFollow?: boolean;
  dangerouslySetAllPagesToNoIndex?: boolean;
}

const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
export function createSEOConfig({
  title,
  description,
  canonicalUrl,
  locale,
}: SeoConfigType = {}): SEOProps {
  const seoTitle = title || '';

  return {
    title: seoTitle,
    description,
    titleTemplate: '%s - Tilawa',
    defaultTitle: config.siteName,
    dangerouslySetAllPagesToNoFollow: !isProduction, // @see https://github.com/garmeeh/next-seo#dangerouslySetAllPagesToNoFollow
    dangerouslySetAllPagesToNoIndex: !isProduction, // @see https://github.com/garmeeh/next-seo#dangerouslySetAllPagesToNoIndex
    canonical: canonicalUrl,
    openGraph: {
      type: 'website',
      locale: getOpenGraphLocale(locale),
      url: canonicalUrl,
      title: seoTitle,
      description,
      images: [
        {
          url: getTilawaDefaultOgImageUrl(),
          width: TILAWA_OG_IMAGE_WIDTH,
          height: TILAWA_OG_IMAGE_HEIGHT,
          alt: config.siteName,
        },
      ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      site_name: config.siteName,
    },
    additionalMetaTags: [
      {
        name: 'Charset',
        content: 'UTF-8',
      },
      {
        name: 'Distribution',
        content: 'Global', // indicates that your webpage is intended for everyone
      },
      {
        name: 'Rating',
        content: 'General', // lets the younger web-surfers know the content is appropriate
      },
      {
        name: 'theme-color',
        content: '#037F70',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, shrink-to-fit=no',
      },
      // ...getOpenGraphAlternateLocales(locale),
    ],
  };
}

/**
 * Concatenate the first 4 verses of the Page/Juz.
 *
 * @param {VersesResponse} response
 * @returns {string}
 */
export const getPageOrJuzMetaDescription = (response: VersesResponse): string => {
  return response.verses
    .slice(0, 4)
    .map((verse) => verse.textImlaeiSimple)
    .join(' - ');
};
