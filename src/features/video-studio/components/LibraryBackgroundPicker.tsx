import Image from 'next/image';
import useTranslation from 'next-translate/useTranslation';

import { StudioCatalog } from '../contracts';

import { ControlProps } from './ContentControls';
import styles from './Studio.module.scss';

const LibraryBackgroundPicker = ({
  spec,
  change,
  catalog,
}: ControlProps & { catalog: StudioCatalog | null }): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const selected = catalog?.backgrounds.find((entry) => entry.id === spec.background.value);
  const label = (entry: StudioCatalog['backgrounds'][number]): string =>
    entry.type === 'image'
      ? t('library-image', {
          collection: t(`background-collections.${entry.collection}`),
          orientation: t(`ratios.${entry.orientation}`),
          number: entry.number,
        })
      : t(`backgrounds.${entry.id}`);
  return (
    <>
      <label htmlFor="studio-backgroundcontrols-3">
        {t('site-backgrounds')}
        <select
          id="studio-backgroundcontrols-3"
          value={spec.background.value}
          onChange={(e) => change({ background: { ...spec.background, value: e.target.value } })}
        >
          {catalog?.backgrounds.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {label(entry)}
            </option>
          ))}
        </select>
      </label>
      {selected?.type === 'image' && (
        <Image
          className={styles.backgroundThumbnail}
          src={selected.url}
          alt={label(selected)}
          width={selected.width ?? 320}
          height={selected.height ?? 180}
          unoptimized
        />
      )}
    </>
  );
};

export default LibraryBackgroundPicker;
