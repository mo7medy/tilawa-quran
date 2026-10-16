import React, { useContext } from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import styles from './ChapterCard.module.scss';

import Card from '@/components/HomePage/Card';
import DataContext from '@/contexts/DataContext';
import buttonStyles from '@/dls/Button/Button.module.scss';
import IconContainer, { IconSize } from '@/dls/IconContainer/IconContainer';
import linkStyles from '@/dls/Link/Link.module.scss';
import ArrowIcon from '@/icons/arrow.svg';
import { getChapterData } from '@/utils/chapter';
import { logButtonClick } from '@/utils/eventLogger';
import { toLocalizedNumber } from '@/utils/locale';
import { getChapterWithStartingVerseUrl, getPageNavigationUrl } from '@/utils/navigation';

type Props = {
  surahNumber: number;
  verseNumber?: number;
  pageNumber?: number;
  isContinueReading?: boolean;
};

const ChapterCard: React.FC<Props> = ({
  surahNumber,
  verseNumber = 1,
  pageNumber = 0,
  isContinueReading = false,
}) => {
  const { t, lang } = useTranslation('home');
  const chaptersData = useContext(DataContext);
  const surahNumberString = surahNumber.toString();
  const chapterData = getChapterData(chaptersData, surahNumberString);

  const onContinueReadingClicked = () => {
    logButtonClick('homepage_chapter_card_continue_reading');
  };

  const onBeginClicked = () => {
    logButtonClick('homepage_chapter_card_begin');
  };

  const link = pageNumber
    ? getPageNavigationUrl(pageNumber)
    : getChapterWithStartingVerseUrl(`${surahNumber}:${verseNumber}`);

  return (
    <Card
      className={styles.chapterCard}
      link={link}
      testId="chapter-card"
      onClick={isContinueReading ? onContinueReadingClicked : onBeginClicked}
    >
      <div className={styles.surahContainer}>
        <div className={styles.surahName} translate="no">
          {surahNumberString.padStart(3, '0')}
        </div>
        <div className={styles.surahInfo}>
          <div>
            <span className={styles.transliteratedName} translate="no">
              {toLocalizedNumber(surahNumber, lang)}. {chapterData.transliteratedName}
            </span>
            <span className={styles.translatedName} translate="no">
              {' '}
              {chapterData.translatedName}
            </span>
          </div>
          {isContinueReading ? (
            <div className={classNames(linkStyles.base, linkStyles.primary)}>
              <div className={styles.continueReading}>
                <span>{t('common:verse')}</span>
                <span>{toLocalizedNumber(verseNumber, lang)}</span>
                <IconContainer
                  size={IconSize.Xsmall}
                  icon={<ArrowIcon />}
                  shouldForceSetColors={false}
                  className={styles.continueReadingArrowIcon}
                />
              </div>
            </div>
          ) : (
            <span
              className={classNames(
                buttonStyles.base,
                buttonStyles.primary,
                buttonStyles.small,
                buttonStyles.withText,
                styles.beginButton,
              )}
            >
              <span className={buttonStyles.content}>{t('begin')}</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ChapterCard;
