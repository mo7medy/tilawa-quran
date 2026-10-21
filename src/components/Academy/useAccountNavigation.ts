import { useOptionalAccountPreview } from '@/components/Account/AccountContext';
import { object } from '@/tilawa/backend/rows';

const useAccountNavigation = () => {
  const account = useOptionalAccountPreview();
  const teacher = !!account?.snapshot?.teacher;
  const state = account?.state;
  return {
    account,
    signedIn: !!account?.userId,
    ready: !account?.backend || !!account.snapshot,
    teacher,
    name: (teacher ? state?.teacher.publicProfile.displayName : state?.student.name) ?? '',
    photo: (teacher ? state?.teacher.publicProfile.photoUrl : state?.student.photo) ?? '',
    profileHref: teacher ? '/profile/teacher' : '/profile',
    primaryHref: teacher ? '/dashboard/teacher' : '/teachers',
    primaryKey: teacher ? 'dashboard' : 'browse-teachers',
    unreadMessages: Math.max(0, Number(object(account?.snapshot).unreadMessages) || 0),
    unreadNotifications: Math.max(0, Number(object(account?.snapshot).unreadNotifications) || 0),
  };
};

export default useAccountNavigation;
