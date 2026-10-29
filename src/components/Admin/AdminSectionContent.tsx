import dynamic from 'next/dynamic';

import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import AdminDirectory from './AdminDirectory';
import AdminFinance from './AdminFinance';
import AdminOverview from './AdminOverview';
import AdminSubscriptions from './AdminSubscriptions';

import type { AdminSection } from '@/tilawa/adminSections';
import type { Row } from '@/tilawa/backend/mappers';

const AdminVideoStudio = dynamic(
  () => import('@/features/video-studio/components/AdminVideoStudio'),
);

const AdminSectionContent = ({
  section,
  data,
}: {
  section: AdminSection | null;
  data: Row;
}): JSX.Element => {
  const { t } = useAccountUi();
  if (section === 'video-studio') return <AdminVideoStudio />;
  if (section === 'overview') return <AdminOverview data={data} />;
  if (section === 'finance') return <AdminFinance />;
  if (section === 'audit') return <AdminDirectory key="audit" section="audit" />;
  if (section === 'subscriptions') return <AdminSubscriptions />;
  if (section === 'students' || section === 'lessons') {
    return <AdminDirectory key={section} section={section} />;
  }
  return (
    <Panel>
      <p>{t('not-found')}</p>
    </Panel>
  );
};
export default AdminSectionContent;
