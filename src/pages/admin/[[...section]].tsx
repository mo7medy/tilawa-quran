import type { GetServerSideProps } from 'next';

// Retire the old entry without redirecting visitors to the replacement path.
export const getServerSideProps: GetServerSideProps = async () => ({ notFound: true });

const RetiredAdminPage = (): null => null;
export default RetiredAdminPage;
