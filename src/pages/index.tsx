import { NextPage } from 'next';
import useTranslation from 'next-translate/useTranslation';

import AcademyHome from '@/components/Academy/AcademyHome';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { getLanguageAlternates } from '@/utils/locale';
import { getCanonicalUrl } from '@/utils/navigation';

/**
 * Tilawa academy homepage (`/` and `/ar`).
 *
 * Programs-first: adult Quran + Arabic teaching, then teachers, how lessons
 * work, CTA, and FAQ. Rendered in the standalone academy shell (see
 * `_app.tsx`): no Quran navbar/footer/audio/font stack on this route.
 * The original Quran homepage lives at `/quran` (`src/pages/quran.tsx`).
 *
 * @returns {JSX.Element} the academy homepage
 */
const AcademyIndex: NextPage = (): JSX.Element => {
  const { t, lang } = useTranslation('academy');

  return (
    <>
      <NextSeoWrapper
        title={t('seo-title')}
        description={t('seo-description')}
        url={getCanonicalUrl(lang, '')}
        languageAlternates={getLanguageAlternates('')}
      />
      <AcademyHome />
    </>
  );
};

export default AcademyIndex;
