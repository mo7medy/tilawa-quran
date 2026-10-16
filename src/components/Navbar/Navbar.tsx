import React from 'react';

import { useSelector, shallowEqual } from 'react-redux';

import LanguageDrawer from './LanguageDrawer/LanguageDrawer';
import styles from './Navbar.module.scss';
import NavbarBody from './NavbarBody';
import NavigationDrawer from './NavigationDrawer/NavigationDrawer';
import SearchDrawer from './SearchDrawer/SearchDrawer';
import SettingsDrawer from './SettingsDrawer/SettingsDrawer';

import AcademyHeader from '@/components/Academy/AcademyHeader';
import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';
import useDebounceNavbarVisibility from '@/hooks/useDebounceNavbarVisibility';
import {
  selectIsLanguageDrawerOpen,
  selectIsNavigationDrawerOpen,
  selectIsSettingsDrawerOpen,
  selectNavbar,
} from '@/redux/slices/navbar';

const Navbar = () => {
  const { isActive } = useOnboarding();
  const { isVisible: isNavbarVisible } = useSelector(selectNavbar, shallowEqual);
  const isNavigationDrawerOpen = useSelector(selectIsNavigationDrawerOpen);
  const isSettingsDrawerOpen = useSelector(selectIsSettingsDrawerOpen);
  const isLanguageDrawerOpen = useSelector(selectIsLanguageDrawerOpen);
  // Use the shared hook to debounce navbar visibility changes
  const showNavbar = useDebounceNavbarVisibility(isNavbarVisible, isActive);

  return (
    <>
      <div className={styles.emptySpacePlaceholder} />
      <AcademyHeader
        isFixed
        isVisible={showNavbar}
        isDimmed={isNavigationDrawerOpen || isSettingsDrawerOpen || isLanguageDrawerOpen}
        actions={<NavbarBody />}
      />
      {/* Drawers rendered outside nav to avoid transform containment issues */}
      <SearchDrawer />
      <SettingsDrawer />
      <NavigationDrawer />
      <LanguageDrawer />
    </>
  );
};

export default Navbar;
