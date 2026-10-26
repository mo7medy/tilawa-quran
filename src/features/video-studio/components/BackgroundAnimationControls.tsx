import useTranslation from 'next-translate/useTranslation';

import backgroundSelection from '../backgroundSelection';
import { StudioCatalog } from '../contracts';

import { ControlProps } from './ContentControls';

const BackgroundAnimationControls = ({
  spec,
  change,
  catalog,
}: ControlProps & {
  catalog: StudioCatalog | null;
}): JSX.Element => {
  const { t } = useTranslation('video-studio');
  const selected = catalog?.backgrounds.find((item) => item.id === spec.background.value);
  if (spec.background.type !== 'library' || selected?.type !== 'image') return null;
  const available = catalog ? backgroundSelection(catalog, selected.id) : [];
  return (
    <>
      <label htmlFor="studio-background-motion">
        <input
          id="studio-background-motion"
          type="checkbox"
          checked={!!spec.background.animate}
          onChange={(event) =>
            change({ background: { ...spec.background, animate: event.target.checked } })
          }
        />
        {t('background-motion')}
      </label>
      {available.length > 1 && (
        <label htmlFor="studio-background-slideshow">
          <input
            id="studio-background-slideshow"
            type="checkbox"
            checked={(spec.background.slides?.length ?? 0) > 1}
            onChange={(event) =>
              change({
                background: {
                  ...spec.background,
                  slides: event.target.checked ? available : [],
                  animate: event.target.checked || spec.background.animate,
                },
              })
            }
          />
          {t('background-slideshow')}
        </label>
      )}
      <small>{t('background-animation-help')}</small>
    </>
  );
};
export default BackgroundAnimationControls;
