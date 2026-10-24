import dynamic from 'next/dynamic';
import Head from 'next/head';
import useTranslation from 'next-translate/useTranslation';

const StudioLibrary = dynamic(() => import('@/features/video-studio/components/StudioLibrary'), {
  ssr: false,
});
const VideoLibraryPage = (): JSX.Element => {
  const { t } = useTranslation('video-studio');
  return (
    <>
      <Head>
        <title>{t('library')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <StudioLibrary />
    </>
  );
};
export default VideoLibraryPage;
