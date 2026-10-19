import AcademyLink from '../Academy/AcademyLink';
import { AccountLink, Panel } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import AdminIcon from './AdminIcon';
import AdminOperationalReport from './AdminOperationalReport';

import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';
import { rows, string } from '@/tilawa/backend/mappers';
import type { Row } from '@/tilawa/backend/mappers';

const AdminOverview = ({ data }: { data: Row }): JSX.Element => {
  const { t } = useAccountUi();
  const pending = rows(data.teachers).filter((teacher) => teacher.approval === 'pending');
  return (
    <>
      <AdminOperationalReport />
      <div className={styles.split}>
        <Panel>
          <div className={styles.queueHeader}>
            <h2>{t('admin-console.review-queue')}</h2>
            <AccountLink to={`${ADMIN_BASE_PATH}/teachers`}>
              {t('admin-console.view-all')}
            </AccountLink>
          </div>
          <p className={styles.subtle}>{t('admin-console.review-queue-hint')}</p>
          {pending.length ? (
            pending.slice(0, 5).map((teacher) => (
              <AcademyLink
                className={styles.taskLink}
                href={`${ADMIN_BASE_PATH}/teachers/${teacher.user_id}`}
                key={string(teacher.user_id)}
              >
                <span>
                  <strong>{string(teacher.display_name)}</strong>
                  <small>
                    {string(teacher.country)} · {t('approval.pending')}
                  </small>
                </span>
                <AdminIcon name="teachers" />
              </AcademyLink>
            ))
          ) : (
            <div className={styles.empty}>
              <AdminIcon name="teachers" />
              <h3>{t('admin.no-requests')}</h3>
              <p>{t('admin-console.queue-empty-hint')}</p>
            </div>
          )}
        </Panel>
        <div>
          <Panel title={t('admin-console.shortcuts')}>
            {(['teachers', 'subscriptions', 'settings', 'audit'] as const).map((section) => (
              <AcademyLink
                key={section}
                className={styles.taskLink}
                href={`${ADMIN_BASE_PATH}/${section}`}
              >
                <span>{t(`admin-console.sections.${section}`)}</span>
                <AdminIcon name={section} />
              </AcademyLink>
            ))}
          </Panel>
          <Panel title={t('admin-console.operating-rules')}>
            <p className={styles.subtle}>{t('admin-console.no-lesson-approval')}</p>
            <p className={styles.subtle}>{t('admin-console.separate-platform')}</p>
          </Panel>
        </div>
      </div>
    </>
  );
};
export default AdminOverview;
