/**
 * Hoisted, typed store + router state for `OnboardingChecklist.homepage.test.tsx`.
 *
 * The `vi.mock('react-redux')` factory runs before the test file's own
 * initializers, so the mocked `useSelector` reads from this imported module
 * (evaluated first) instead of an untyped `globalThis` bucket.
 */

interface OnboardingChecklistTestStore {
  onboarding: {
    isChecklistVisible: boolean;
    checklistDismissals: number;
    completedGroups: Record<string, { isCompleted: boolean }>;
  };
  readingPreferences: { readingPreference: string };
}

interface OnboardingChecklistTestState {
  pathname: string;
  store: OnboardingChecklistTestStore;
}

export const onboardingChecklistTestState: OnboardingChecklistTestState = {
  pathname: '/quran',
  store: {
    onboarding: { isChecklistVisible: false, checklistDismissals: 0, completedGroups: {} },
    readingPreferences: { readingPreference: 'translation' },
  },
};

/**
 * Point the mocked checklist at a route and visibility.
 *
 * @param {string} pathname Pages Router pathname under test
 * @param {boolean} isChecklistVisible whether the full checklist is open
 * @returns {void}
 */
export const setOnboardingChecklistTestRoute = (
  pathname: string,
  isChecklistVisible: boolean,
): void => {
  onboardingChecklistTestState.pathname = pathname;
  onboardingChecklistTestState.store.onboarding.isChecklistVisible = isChecklistVisible;
};
