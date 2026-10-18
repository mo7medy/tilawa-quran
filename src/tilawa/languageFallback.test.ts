import { describe, expect, it } from 'vitest';

// Next.js loads this configuration as CommonJS.
// eslint-disable-next-line import/default
import config from '../../i18n.js';
import arAcademy from '../../locales/ar/academy.json';
import arAccount from '../../locales/ar/account.json';
import arCommon from '../../locales/ar/common.json';
import enAcademy from '../../locales/en/academy.json';
import enAccount from '../../locales/en/account.json';
import enCommon from '../../locales/en/common.json';
import nlCommon from '../../locales/nl/common.json';

describe('Site locale loading', () => {
  it('loads account content in Arabic and English with English fallback for other reader locales', async () => {
    await Promise.all(
      config.locales.map(async (locale: string) => {
        expect(await config.loadLocaleFrom(locale, 'account')).toEqual(
          locale === 'ar' ? arAccount : enAccount,
        );
      }),
    );
  });
  it('loads English academy copy for every reader locale without academy translations', async () => {
    await Promise.all(
      config.locales.map(async (locale: string) => {
        const academy = await config.loadLocaleFrom(locale, 'academy');
        expect(academy).toEqual(locale === 'ar' ? arAcademy : enAcademy);
      }),
    );
  });

  it('preserves translated Dutch reader copy and fills Tilawa navigation and Quran headings', async () => {
    const common = await config.loadLocaleFrom('nl', 'common');
    expect(common.languages).toBe(nlCommon.languages);
    expect(common['site-nav']).toEqual(enCommon['site-nav']);
    expect(common['read-quran']).toBe(enCommon['read-quran']);
    expect(common['quran-intro']).toBe(enCommon['quran-intro']);
    expect(common.tilawa).toBe(enCommon.tilawa);
  });

  it('keeps Arabic and English copy intact', async () => {
    expect(await config.loadLocaleFrom('ar', 'common')).toMatchObject(arCommon);
    expect(await config.loadLocaleFrom('en', 'common')).toEqual(enCommon);
  });
});
