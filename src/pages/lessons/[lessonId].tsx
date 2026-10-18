import AccountPage from '@/components/Account/AccountPage';

const LessonDetailsPage = (): JSX.Element => <AccountPage area="lesson" />;
export default LessonDetailsPage;
export { protectAccountPage as getServerSideProps } from '@/lib/supabase/protectPage';
