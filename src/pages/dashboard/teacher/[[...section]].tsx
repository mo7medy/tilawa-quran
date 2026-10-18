import AccountPage from '@/components/Account/AccountPage';

const TeacherDashboardPage = (): JSX.Element => <AccountPage area="teacher" />;
export default TeacherDashboardPage;
export { protectAccountPage as getServerSideProps } from '@/lib/supabase/protectPage';
