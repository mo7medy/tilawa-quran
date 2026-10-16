import React from 'react';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  onboardingChecklistTestState,
  setOnboardingChecklistTestRoute,
} from './onboardingChecklistTestState';

import OnboardingChecklist from './index';

vi.mock('next/router', () => ({
  useRouter: () => ({ pathname: onboardingChecklistTestState.pathname, push: vi.fn() }),
}));

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));

vi.mock('next-translate/Trans', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(onboardingChecklistTestState.store),
  useDispatch: () => vi.fn(),
}));

vi.mock('@/components/Onboarding/OnboardingProvider', () => ({
  useOnboarding: () => ({ startTour: vi.fn(), isActive: false }),
}));

// The real slice pulls `defaultSettings/util`, whose locale `require()` cannot
// resolve under vitest. The component only needs the selector + action stub.
vi.mock('@/redux/slices/onboarding', () => ({
  dismissChecklist: () => ({ type: 'onboarding/dismissChecklist' }),
  setIsChecklistVisible: (payload: boolean) => ({
    type: 'onboarding/setIsChecklistVisible',
    payload,
  }),
  selectOnboarding: (state: {
    onboarding: {
      isChecklistVisible: boolean;
      checklistDismissals: number;
      completedGroups: Record<string, { isCompleted: boolean }>;
    };
  }) => state.onboarding,
}));

vi.mock('@/redux/slices/QuranReader/readingPreferences', () => ({
  selectReadingPreferences: (state: { readingPreferences: { readingPreference: string } }) =>
    state.readingPreferences,
  setReadingPreference: (payload: string) => ({
    type: 'readingPreferences/setReadingPreference',
    payload,
  }),
}));

vi.mock('@/hooks/auth/usePersistPreferenceGroup', () => ({
  default: () => ({ actions: { onSettingsChange: vi.fn() }, isLoading: false }),
}));

vi.mock('./hooks/useShowChecklistAfterInterval', () => ({ default: () => {} }));

vi.mock('../steps', () => ({ onboardingChecklist: () => [] }));

vi.mock('@/icons/check.svg', () => ({ default: () => <svg /> }));
vi.mock('@/icons/close.svg', () => ({ default: () => <svg /> }));
vi.mock('@/icons/question-mark-icon.svg', () => ({ default: () => <svg /> }));

afterEach(() => {
  cleanup();
});

describe('OnboardingChecklist help opener', () => {
  const renderChecklist = () => (
    <TooltipProvider>
      <OnboardingChecklist />
    </TooltipProvider>
  );

  it('should render the help opener on the preserved Quran homepage', () => {
    setOnboardingChecklistTestRoute('/quran', false);
    render(renderChecklist());
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should render nothing on the academy homepage', () => {
    setOnboardingChecklistTestRoute('/', false);
    const { container } = render(renderChecklist());
    expect(container.querySelector('button')).toBeNull();
  });

  it('should render the full checklist when visible regardless of route', () => {
    setOnboardingChecklistTestRoute('/', true);
    const { container } = render(renderChecklist());
    expect(container.textContent?.length).toBeGreaterThan(0);
  });
});
