import { stringify } from 'querystring';

import type { GetServerSideProps } from 'next';

import { ROUTES } from '@/utils/navigation';
import { withLocalePrefix } from '@/utils/tilawaRoutes';

// Preserve old bookmarks and auth links; the Tilawa account UI lives at /sign-in.
export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const search = stringify(query);
  return {
    redirect: {
      destination: withLocalePrefix(`${ROUTES.LOGIN}${search ? `?${search}` : ''}`, locale),
      permanent: false,
    },
  };
};

const LegacyLoginPage = (): null => null;

export default LegacyLoginPage;
