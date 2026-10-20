import { Field } from '../Account/AccountUi';
import { useAccountUi } from '../Account/useAccountUi';

import styles from './AdminConsole.module.scss';
import { STATUSES } from './adminDirectoryColumns';

export interface DirectoryFilters {
  search: string;
  status: string;
  subject: string;
  from: string;
  until: string;
}
const AdminDirectoryFilters = ({
  section,
  query,
  onChange,
  onApply,
}: {
  section: string;
  query: DirectoryFilters;
  onChange: (value: DirectoryFilters) => void;
  onApply: () => void;
}): JSX.Element => {
  const { t } = useAccountUi();
  return (
    <form
      className={styles.filters}
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <Field
        type="search"
        label={t('backend-ui.search')}
        value={query.search}
        maxLength={100}
        onChange={(e) => onChange({ ...query, search: e.target.value })}
      />
      <label htmlFor={`admin-${section}-status`}>
        {t('backend-ui.columns.status')}
        <select
          id={`admin-${section}-status`}
          value={query.status}
          onChange={(e) => onChange({ ...query, status: e.target.value })}
        >
          {['all', ...STATUSES[section]].map((s) => (
            <option key={s} value={s}>
              {t(s === 'all' ? 'all' : `backend-ui.values.${s}`)}
            </option>
          ))}
        </select>
      </label>
      {['lessons', 'subscriptions'].includes(section) && (
        <label htmlFor={`admin-${section}-subject`}>
          {t('backend-ui.columns.subject')}
          <select
            id={`admin-${section}-subject`}
            value={query.subject}
            onChange={(e) => onChange({ ...query, subject: e.target.value })}
          >
            {['all', 'arabic', 'quran'].map((s) => (
              <option key={s} value={s}>
                {t(s === 'all' ? 'all' : `subject.${s}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      <Field
        type="date"
        label={t('backend-ui.from')}
        value={query.from}
        required={!!query.until}
        onChange={(e) => onChange({ ...query, from: e.target.value })}
      />
      <Field
        type="date"
        label={t('backend-ui.until')}
        value={query.until}
        required={!!query.from}
        min={query.from}
        onChange={(e) => onChange({ ...query, until: e.target.value })}
      />
      <button type="submit">{t('backend-ui.apply')}</button>
    </form>
  );
};
export default AdminDirectoryFilters;
