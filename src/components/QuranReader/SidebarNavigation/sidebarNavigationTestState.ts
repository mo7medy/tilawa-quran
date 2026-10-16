/**
 * Hoisted, typed store + router state for `SidebarNavigation.homepage.test.tsx`.
 *
 * The `vi.mock('react-redux')` factory runs before the test file's own
 * initializers, so the mocked `useSelector` reads from this imported module
 * (evaluated first) instead of an untyped `globalThis` bucket.
 */

interface SidebarNavigationTestStore {
  sidebarNavigation: { isVisible: boolean; selectedNavigationItem: string };
  navbar: { isVisible: boolean; isNavigationDrawerOpen: boolean };
  revelationOrder: { isReadingByRevelationOrder: boolean };
}

interface SidebarNavigationTestState {
  pathname: string;
  store: SidebarNavigationTestStore;
}

export const sidebarNavigationTestState: SidebarNavigationTestState = {
  pathname: '/quran',
  store: {
    sidebarNavigation: { isVisible: false, selectedNavigationItem: 'surah' },
    navbar: { isVisible: true, isNavigationDrawerOpen: false },
    revelationOrder: { isReadingByRevelationOrder: false },
  },
};

/**
 * Point the mocked router at a pathname.
 *
 * @param {string} pathname Pages Router pathname under test
 * @returns {void}
 */
export const setSidebarNavigationTestPathname = (pathname: string): void => {
  sidebarNavigationTestState.pathname = pathname;
};
