import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { StudioCatalog, VideoProjectSpec } from '../contracts';

import styles from './Studio.module.scss';

export interface ControlProps {
  spec: VideoProjectSpec;
  change: (patch: Partial<VideoProjectSpec>) => void;
}
const ContentControls = ({
  spec,
  change,
  catalog,
}: ControlProps & { catalog: StudioCatalog | null }): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const [search, setSearch] = useState('');
  const count = catalog?.chapters.find((c) => c.id === spec.chapterId)?.count ?? 286;
  return (
    <details open className={styles.section}>
      <summary>{t('content')}</summary>
      <div className={styles.fields}>
        <label htmlFor="studio-contentcontrols-1">
          {t('project-title')}
          <input
            id="studio-contentcontrols-1"
            value={spec.title}
            maxLength={100}
            onChange={(e) => change({ title: e.target.value })}
          />
        </label>
        <label htmlFor="studio-contentcontrols-2">
          {t('chapter')}
          <select
            id="studio-contentcontrols-2"
            value={spec.chapterId}
            onChange={(e) => change({ chapterId: Number(e.target.value), from: 1, to: 1 })}
          >
            {catalog?.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.row}>
          <label htmlFor="studio-contentcontrols-3">
            {t('from')}
            <input
              id="studio-contentcontrols-3"
              type="number"
              min={1}
              max={count}
              value={spec.from}
              onChange={(e) =>
                change({
                  from: Number(e.target.value),
                  to: Math.max(spec.to, Number(e.target.value)),
                })
              }
            />
          </label>
          <label htmlFor="studio-contentcontrols-4">
            {t('to')}
            <input
              id="studio-contentcontrols-4"
              type="number"
              min={spec.from}
              max={count}
              value={spec.to}
              onChange={(e) => change({ to: Number(e.target.value) })}
            />
          </label>
        </div>
        <label htmlFor="studio-contentcontrols-5">
          {t('search-reciter')}
          <input
            id="studio-contentcontrols-5"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label htmlFor="studio-contentcontrols-6">
          {t('reciter')}
          <select
            id="studio-contentcontrols-6"
            value={spec.reciterId}
            onChange={(e) => change({ reciterId: Number(e.target.value) })}
          >
            {catalog?.reciters
              .filter(
                (r) =>
                  r.id === spec.reciterId ||
                  r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <p>{t('reciter-help')}</p>
        <label htmlFor="studio-contentcontrols-7">
          {t('translation')}
          <select
            id="studio-contentcontrols-7"
            value={spec.translationId ?? ''}
            onChange={(e) =>
              change({ translationId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">{t('none')}</option>
            {catalog?.translations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.language} — {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
};
export default ContentControls;
