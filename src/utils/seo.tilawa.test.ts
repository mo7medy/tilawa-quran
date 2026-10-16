/* eslint-disable react-func/max-lines-per-function */
import { describe, expect, it } from 'vitest';

import {
  config,
  createSEOConfig,
  getTilawaDefaultOgImageUrl,
  TILAWA_OG_IMAGE_HEIGHT,
  TILAWA_OG_IMAGE_PATH,
  TILAWA_OG_IMAGE_WIDTH,
} from './seo';

describe('Tilawa SEO config', () => {
  it('should brand the site as Tilawa', () => {
    expect(config.siteName).toBe('Tilawa');
    const seo = createSEOConfig({ title: 'Read Quran', locale: 'en' });
    expect(seo.titleTemplate).toBe('%s - Tilawa');
    expect(seo.defaultTitle).toBe('Tilawa');
    expect(seo.openGraph?.site_name).toBe('Tilawa');
  });

  it('should not emit legacy Quran.com social/app metadata', () => {
    const seo = createSEOConfig({ title: 'Read Quran', locale: 'en' });
    expect(seo.twitter).toBeUndefined();
    expect(seo.facebook).toBeUndefined();
    const metaTags = seo.additionalMetaTags ?? [];
    expect(
      metaTags.some((tag) => tag.content === '603289706669016' || tag.property === 'fb:pages'),
    ).toBe(false);
  });

  it('should carry the Tilawa theme color', () => {
    const seo = createSEOConfig({ title: 'Read Quran', locale: 'en' });
    const metaTags = seo.additionalMetaTags ?? [];
    expect(metaTags.some((tag) => tag.content === '#037F70')).toBe(true);
  });

  it('should use the deployment-local Tilawa icon as the default preview image', () => {
    expect(TILAWA_OG_IMAGE_PATH).toBe('/tilawa/app_icon.png');
    expect(TILAWA_OG_IMAGE_WIDTH).toBe(499);
    expect(TILAWA_OG_IMAGE_HEIGHT).toBe(500);
    expect(getTilawaDefaultOgImageUrl()).toContain('/tilawa/app_icon.png');

    const seo = createSEOConfig({ title: 'Read Quran', locale: 'en' });
    const images = seo.openGraph?.images ?? [];
    expect(images).toHaveLength(1);
    expect(images[0].url).toContain('/tilawa/app_icon.png');
    expect(images[0].url).not.toContain('og.qurancdn.com');
    expect(images[0].width).toBe(499);
    expect(images[0].height).toBe(500);
  });
});
