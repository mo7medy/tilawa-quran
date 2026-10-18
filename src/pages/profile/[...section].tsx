import AccountPage from '@/components/Account/AccountPage';

const ProfileSectionPage = (): JSX.Element => <AccountPage area="profile" />;
export default ProfileSectionPage;
export { protectAccountPage as getServerSideProps } from '@/lib/supabase/protectPage';
