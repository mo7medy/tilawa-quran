import dynamic from 'next/dynamic';
import Head from 'next/head';
import useTranslation from 'next-translate/useTranslation';

const StudioAutomation = dynamic(
  () => import('@/features/video-studio/components/StudioAutomation'),
  { ssr: false },
);
const VideoAutomationPage = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  return (
    <>
      <Head>
        <title>{t('automation.title')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <StudioAutomation />
    </>
  );
};
export default VideoAutomationPage;
