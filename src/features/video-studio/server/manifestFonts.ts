/* eslint-disable react-func/max-lines-per-function -- One font manifest resolves page fonts and the matching language assets together. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { StudioVerse, VideoProjectSpec, StudioAsset } from '../contracts';
import { fontPath, fontFamily } from '../typography';
import { assert } from '../validation';

import { AssetIndex, content, list, Resource } from './contentSources';
import { StudioEnv } from './runtime';

import { QuranFont } from '@/types/QuranReader';

export const resolveFonts = async (
  env: StudioEnv,
  spec: VideoProjectSpec,
  resolved: StudioVerse[],
  index: AssetIndex,
): Promise<StudioAsset[]> => {
  const paths = new Map<string, string>();
  resolved.forEach((v) =>
    v.words.forEach((w) => paths.set(fontPath(spec.font, w.page), fontFamily(spec.font, w.page))),
  );
  if (spec.font === QuranFont.IndoPak) {
    paths.set(fontPath(QuranFont.QPCHafs), fontFamily(QuranFont.QPCHafs));
  }
  let translationFont = '/fonts/lang/arabic/NotoNaskhArabic-Regular.woff2';
  if (spec.translationId) {
    const translations = await content('resources/translations?language=en');
    const language = list<Resource>(translations.translations)
      .find((r) => r.id === spec.translationId)
      ?.language_name?.toLowerCase();
    const fontByLanguage = {
      urdu: '/fonts/lang/urdu/MehrNastaliqWeb.woff2',
      bengali: '/fonts/lang/bengali/NotoSerifBengali-Regular.woff2',
      vietnamese: '/fonts/lang/vietnamese/BeVietnamPro-Regular.woff2',
      kurdish: '/fonts/lang/kurdish/droid-naskh-regular.woff2',
      divehi: '/fonts/lang/dhivehi/DhivehiAkuru.woff2',
    };
    translationFont = fontByLanguage[language] ?? translationFont;
  }
  paths.set(translationFont, 'StudioTranslation');
  paths.set('/fonts/lang/Figtree/Figtree.ttf', 'StudioTranslationFallback');
  const fonts = Array.from(paths, ([path, family]) => {
    const item = index.files[path];
    assert(item, 'FONT_UNAVAILABLE', 503);
    return {
      url: `${env.STUDIO_ORIGIN}/api/video-studio/assets/${item.sha256}`,
      sha256: item.sha256,
      family,
    };
  });

  return fonts;
};
