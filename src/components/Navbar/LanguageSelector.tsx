/* eslint-disable react-func/max-lines-per-function */
import React from 'react';

import useTranslation from 'next-translate/useTranslation';

import Button, { ButtonShape, ButtonVariant } from '../dls/Button/Button';
import PopoverMenu, { PopoverMenuExpandDirection } from '../dls/PopoverMenu/PopoverMenu';

import styles from './LanguageSelector.module.scss';

import useLanguageChange from '@/hooks/useLanguageChange';
import ChevronSelectIcon from '@/icons/chevron-select.svg';
import GlobeIcon from '@/icons/globe.svg';
import { logEvent } from '@/utils/eventLogger';
import { getLocaleName } from '@/utils/locale';
import i18nConfig from 'i18n.json';

const { locales } = i18nConfig;

const options = locales.map((lng) => ({
  label: getLocaleName(lng),
  value: lng,
}));

type LanguageSelectorProps = {
  shouldShowSelectedLang?: boolean;
  expandDirection?: PopoverMenuExpandDirection;
};

const LanguageSelector = ({
  shouldShowSelectedLang: isFooter,
  expandDirection = PopoverMenuExpandDirection.BOTTOM,
}: LanguageSelectorProps) => {
  const { t, lang } = useTranslation('common');
  const { onLanguageChange, isChangingLanguage } = useLanguageChange();

  const onOpenChange = (open: boolean) => {
    if (open) {
      if (isFooter) {
        logEvent(`footer_language_selector_open`);
      } else {
        logEvent(`navbar_language_selector_open`);
      }
      return;
    }

    if (isFooter) {
      logEvent(`footer_language_selector_close`);
    } else {
      logEvent(`navbar_language_selector_close`);
    }
  };

  return (
    <PopoverMenu
      expandDirection={expandDirection}
      trigger={
        isFooter ? (
          <Button
            className={styles.triggerButton}
            prefix={
              <span className={styles.globeIconWrapper}>
                <GlobeIcon />
              </span>
            }
            tooltip={t('languages')}
            variant={ButtonVariant.Ghost}
            suffix={
              <span className={styles.triggerSuffixContainer}>
                <ChevronSelectIcon />
              </span>
            }
          >
            {getLocaleName(lang)}
          </Button>
        ) : (
          <Button
            tooltip={t('languages')}
            shape={ButtonShape.Circle}
            variant={ButtonVariant.Ghost}
            ariaLabel={t('aria.select-lng')}
          >
            <span className={styles.globeIconWrapper}>
              <GlobeIcon />
            </span>
          </Button>
        )
      }
      onOpenChange={onOpenChange}
      isPortalled={false}
      contentClassName={styles.languageMenuContent}
    >
      {options.map((option) => (
        <PopoverMenu.Item
          isSelected={option.value === lang}
          isDisabled={isChangingLanguage}
          shouldCloseMenuAfterClick
          key={option.value}
          onClick={() => onLanguageChange(option.value)}
        >
          {option.label}
        </PopoverMenu.Item>
      ))}
    </PopoverMenu>
  );
};

export default LanguageSelector;
