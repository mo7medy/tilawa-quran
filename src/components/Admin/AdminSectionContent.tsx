import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import AdminAudit from './AdminAudit';
import AdminFinance from './AdminFinance';
import AdminOverview from './AdminOverview';
import AdminPlannedSection from './AdminPlannedSection';
import AdminSubscriptions from './AdminSubscriptions';

import type { AdminSection } from '@/tilawa/adminSections';
import type { Row } from '@/tilawa/backend/mappers';

const AdminSectionContent = ({
  section,
  data,
}: {
  section: AdminSection | null;
  data: Row;
}): JSX.Element => {
  const { t } = useAccountUi();
  if (section === 'overview') return <AdminOverview data={data} />;
  if (section === 'finance') return <AdminFinance />;
  if (section === 'audit') return <AdminAudit data={data} />;
  if (section === 'subscriptions') return <AdminSubscriptions />;
  if (section === 'students' || section === 'lessons') {
    return <AdminPlannedSection section={section} />;
  }
  return (
    <Panel>
      <p>{t('not-found')}</p>
    </Panel>
  );
};
export default AdminSectionContent;
