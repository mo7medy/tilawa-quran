import { Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import AdminIcon from './AdminIcon';

type PlannedSection = 'students' | 'lessons' | 'subscriptions';
const columns: Record<PlannedSection, string[]> = {
  students: ['student', 'country', 'status', 'joined'],
  lessons: ['student', 'teacher', 'subject', 'date', 'status'],
  subscriptions: ['student', 'package', 'subject', 'remaining', 'renewal', 'status'],
};

const AdminPlannedSection = ({ section }: { section: PlannedSection }): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <Panel title={t(`admin-console.lists.${section}`)}>
      <p className={styles.stageNote}>{t('admin-console.connection-pending')}</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns[section].map((key) => (
                <th key={key} scope="col">
                  {t(`admin-console.columns.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns[section].length}>
                <div className={styles.empty}>
                  <AdminIcon name={section} />
                  <h3>{t('admin-console.awaiting-connection')}</h3>
                  <p>{t(`admin-console.scope.${section}`)}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
export default AdminPlannedSection;
