import useTranslation from 'next-translate/useTranslation';

import AcademyPricing from '@/components/Academy/AcademyPricing';
import NextSeoWrapper from '@/components/NextSeoWrapper';
import { getLanguageAlternates } from '@/utils/locale';
import { getCanonicalUrl } from '@/utils/navigation';

const PricingPage = (): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  return (
    <>
      <NextSeoWrapper
        title={t('pricing.seo-title')}
        description={t('pricing.subtitle')}
        url={getCanonicalUrl(lang, '/pricing')}
        languageAlternates={getLanguageAlternates('/pricing')}
      />
      <AcademyPricing />
    </>
  );
};

export default PricingPage;
