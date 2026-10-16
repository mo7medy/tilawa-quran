import React, { useMemo, useCallback } from 'react';

import useTranslation from 'next-translate/useTranslation';
import { useDispatch, useSelector } from 'react-redux';

import Drawer, { DrawerSide, DrawerType } from '../Drawer';

import styles from './LanguageDrawer.module.scss';

import SiteLanguageOptions from '@/components/Academy/SiteLanguageOptions';
import Button, { ButtonSize, ButtonVariant } from '@/dls/Button/Button';
import useLanguageChange from '@/hooks/useLanguageChange';
import IconArrowLeft from '@/icons/arrow-left.svg';
import { selectIsNavigationDrawerOpen, setIsLanguageDrawerOpen } from '@/redux/slices/navbar';

const LanguageDrawer = () => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const isNavigationDrawerOpen = useSelector(selectIsNavigationDrawerOpen);
  const { isChangingLanguage, changingLocale, onLanguageChange } = useLanguageChange();

  const closeDrawer = useCallback(() => {
    dispatch(setIsLanguageDrawerOpen(false));
  }, [dispatch]);

  const handleLanguageChange = useCallback(
    async (newLocale: string) => {
      await onLanguageChange(newLocale, closeDrawer);
    },
    [onLanguageChange, closeDrawer],
  );

  const header = useMemo(() => {
    const content = (
      <span id="language-dialog-title" className={styles.languageTitle}>
        {t('select-language')}
      </span>
    );

    if (isNavigationDrawerOpen) {
      return (
        <div className={styles.languageHeader}>
          <Button
            prefix={<IconArrowLeft />}
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Small}
            onClick={closeDrawer}
            className={styles.backButton}
            isDisabled={isChangingLanguage}
          >
            {content}
          </Button>
        </div>
      );
    }

    return <div className={styles.languageHeader}>{content}</div>;
  }, [isNavigationDrawerOpen, t, closeDrawer, isChangingLanguage]);

  return (
    <Drawer id="language-drawer" type={DrawerType.Language} side={DrawerSide.Right} header={header}>
      <SiteLanguageOptions changingLocale={changingLocale} onSelect={handleLanguageChange} />
    </Drawer>
  );
};

export default LanguageDrawer;
