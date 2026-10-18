import AccountPage from '@/components/Account/AccountPage';

const ProfilePage = (): JSX.Element => <AccountPage area="profile" />;
export default ProfilePage;
export { protectAccountPage as getServerSideProps } from '@/lib/supabase/protectPage';
