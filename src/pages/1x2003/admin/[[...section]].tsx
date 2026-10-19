import AdminAccount from '@/components/Account/AdminAccount';

export default AdminAccount;
export { protectAccountPage as getServerSideProps } from '@/lib/supabase/protectPage';
