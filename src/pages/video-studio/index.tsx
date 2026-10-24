import dynamic from 'next/dynamic';
import Head from 'next/head';
import useTranslation from 'next-translate/useTranslation';

const StudioEntry = dynamic(() => import('@/features/video-studio/components/StudioEntry'), {
  ssr: false,
});
const VideoStudioPage = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <StudioEntry />
    </>
  );
};
export default VideoStudioPage;
