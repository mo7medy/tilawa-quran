import useTranslation from 'next-translate/useTranslation';

import { STUDIO_FONTS, StudioFont, StudioRatio, StudioTemplate } from '../contracts';

import { ControlProps } from './ContentControls';
import styles from './Studio.module.scss';

import { MushafLines, QuranFont } from '@/types/QuranReader';

const StyleControls = ({ spec, change }: ControlProps): JSX.Element => {
  const { t } = useTranslation('video-studio');
  return (
    <>
      <details className={styles.section}>
        <summary>{t('font')}</summary>
        <div className={styles.fields}>
          <label htmlFor="studio-stylecontrols-1">
            {t('font-style')}
            <select
              id="studio-stylecontrols-1"
              value={spec.font}
              onChange={(e) => change({ font: e.target.value as StudioFont })}
            >
              {STUDIO_FONTS.map((f) => (
                <option key={f} value={f}>
                  {t(`fonts.${f}`)}
                </option>
              ))}
            </select>
          </label>
          {spec.font === QuranFont.IndoPak && (
            <label htmlFor="studio-stylecontrols-2">
              {t('mushaf-lines')}
              <select
                id="studio-stylecontrols-2"
                value={spec.mushafLines}
                onChange={(e) => change({ mushafLines: e.target.value as MushafLines })}
              >
                {Object.values(MushafLines).map((lines) => (
                  <option key={lines} value={lines}>
                    {t(lines)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label htmlFor="studio-stylecontrols-3">
            {t('font-size')}
            <input
              id="studio-stylecontrols-3"
              type="range"
              min={24}
              max={120}
              value={spec.fontSize}
              onChange={(e) => change({ fontSize: Number(e.target.value) })}
            />
            <output>{spec.fontSize}</output>
          </label>
          <label htmlFor="studio-stylecontrols-4">
            {t('translation-size')}
            <input
              id="studio-stylecontrols-4"
              type="range"
              min={18}
              max={80}
              value={spec.translationSize}
              onChange={(e) => change({ translationSize: Number(e.target.value) })}
            />
            <output>{spec.translationSize}</output>
          </label>
          <label htmlFor="studio-stylecontrols-5">
            {t('line-height')}
            <input
              id="studio-stylecontrols-5"
              type="range"
              min={1.2}
              max={2.5}
              step={0.1}
              value={spec.lineHeight}
              onChange={(e) => change({ lineHeight: Number(e.target.value) })}
            />
          </label>
          <label htmlFor="studio-stylecontrols-6">
            {t('text-color')}
            <input
              id="studio-stylecontrols-6"
              type="color"
              value={spec.color}
              onChange={(e) => change({ color: e.target.value })}
            />
          </label>
          <label htmlFor="studio-stylecontrols-7">
            {t('alignment')}
            <select
              id="studio-stylecontrols-7"
              value={spec.alignment}
              onChange={(e) => change({ alignment: e.target.value as 'center' | 'justify' })}
            >
              <option value="center">{t('center')}</option>
              <option value="justify">{t('justify')}</option>
            </select>
          </label>
        </div>
      </details>
      <details className={styles.section}>
        <summary>{t('design')}</summary>
        <div className={styles.fields}>
          <label htmlFor="studio-stylecontrols-8">
            {t('template')}
            <select
              id="studio-stylecontrols-8"
              value={spec.template}
              onChange={(e) => change({ template: e.target.value as StudioTemplate })}
            >
              {['center', 'card', 'translation'].map((template) => (
                <option value={template} key={template}>
                  {t(`templates.${template}`)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="studio-stylecontrols-9">
            {t('ratio')}
            <select
              id="studio-stylecontrols-9"
              value={spec.ratio}
              onChange={(e) => change({ ratio: e.target.value as StudioRatio })}
            >
              {['portrait', 'square', 'landscape'].map((r) => (
                <option key={r} value={r}>
                  {t(`ratios.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="studio-stylecontrols-10">
            {t('quality')}
            <select
              id="studio-stylecontrols-10"
              value={spec.quality}
              onChange={(e) => change({ quality: Number(e.target.value) as 720 | 1080 })}
            >
              <option value={720}>{t('resolution', { height: 720 })}</option>
              <option value={1080}>{t('resolution', { height: 1080 })}</option>
            </select>
          </label>
        </div>
      </details>
    </>
  );
};
export default StyleControls;
