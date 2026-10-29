/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard users must be able to scroll the labelled wide table region. */
import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { StudioAdminState } from '../multiPublishing';

import styles from './AdminVideo.module.scss';

const AdminVideoReports = ({ data }: { data: StudioAdminState }): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [destinationFilter, setDestinationFilter] = useState('');
  const names = new Map(data.destinations.map((d) => [d.id, d.name]));
  return (
    <section className={styles.card}>
      <h2>{t('admin.reports')}</h2>
      <label htmlFor="studio-destination-filter">
        {t('admin.filter')}
        <select
          id="studio-destination-filter"
          value={destinationFilter}
          onChange={(event) => setDestinationFilter(event.target.value)}
        >
          <option value="">{t('admin.all')}</option>
          {data.destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.platform}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.table} tabIndex={0} role="region" aria-label={t('admin.daily-plan')}>
        <table>
          <caption>{t('admin.daily-plan')}</caption>
          <thead>
            <tr>
              <th>{t('admin.day')}</th>
              <th>{t('admin.destinations')}</th>
              <th>{t('admin.status')}</th>
            </tr>
          </thead>
          <tbody>
            {data.runs
              .filter((r) => !destinationFilter || r.destinationIds.includes(destinationFilter))
              .slice(0, 60)
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.day} · {[9, 14, 19][r.slot]}:00
                  </td>
                  <td>{r.destinationIds.map((id) => names.get(id) ?? id).join(' · ')}</td>
                  <td>
                    {t(`automation.states.${r.status}`)}{' '}
                    {r.error && t(`errors.${r.error}`, undefined, { fallback: r.error })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <h3>{t('admin.posts')}</h3>
      <ul>
        {data.publications
          .filter((p) => !destinationFilter || p.destinationId === destinationFilter)
          .slice(0, 60)
          .map((p) => (
            <li key={p.id}>
              {names.get(p.destinationId)} · {p.platform} · {t(`publishing.status.${p.status}`)} ·{' '}
              {p.caption} {p.error && t(`errors.${p.error}`, undefined, { fallback: p.error })}{' '}
              {p.externalUrl && (
                <a href={p.externalUrl} target="_blank" rel="noreferrer">
                  {t('admin.open-post')}
                </a>
              )}
            </li>
          ))}
      </ul>
      <details>
        <summary>{t('admin.audit')}</summary>
        <ul>
          {data.audit.map((a) => (
            <li key={a.id}>
              {new Date(a.createdAt).toISOString()} · {a.actor} · {a.action} · {a.subject} ·{' '}
              {a.detail}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
};
export default AdminVideoReports;
