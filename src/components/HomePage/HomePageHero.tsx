import { useState } from 'react';

import useTranslation from 'next-translate/useTranslation';

import NavigationButton from './HeroButtons/NavigationButton';
import PopularButton from './HeroButtons/PopularButton';
import styles from './HomePageHero.module.scss';

import PopularDropdown from '@/components/HomePage/PopularDropdown';
import SearchInput from '@/components/Search/SearchInput';

const HomePageHero = () => {
  const { t } = useTranslation('common');
  const [isPopularDropdownOpen, setIsPopularDropdownOpen] = useState(false);

  const handlePopularClick = () => {
    setIsPopularDropdownOpen((prev) => !prev);
  };

  const handleDropdownClose = () => {
    setIsPopularDropdownOpen(false);
  };

  return (
    <div className={styles.outerContainer}>
      <div className={styles.backgroundImage} aria-hidden="true" />
      <div>
        <div className={styles.innerContainer}>
          <div className={styles.logoContainer}>
            <img src="/tilawa/logo.svg" alt="" width={42} height={42} />
            <span>{t('tilawa')}</span>
          </div>
          <h1 className={styles.title}>{t('read-quran')}</h1>
          <p className={styles.description}>{t('quran-intro')}</p>
          <SearchInput
            placeholder={t('command-bar.placeholder')}
            shouldExpandOnClick
            shouldOpenDrawerOnMobile
          />
          {!isPopularDropdownOpen && (
            <div className={styles.buttonsContainer}>
              <NavigationButton />
              <PopularButton onClick={handlePopularClick} />
            </div>
          )}
          <PopularDropdown isOpen={isPopularDropdownOpen} onClose={handleDropdownClose} />
        </div>
      </div>
    </div>
  );
};
export default HomePageHero;
