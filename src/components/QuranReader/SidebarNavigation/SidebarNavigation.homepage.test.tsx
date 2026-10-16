import React from 'react';

import { TooltipProvider } from '@radix-ui/react-tooltip';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SidebarNavigation from './SidebarNavigation';
import {
  sidebarNavigationTestState,
  setSidebarNavigationTestPathname,
} from './sidebarNavigationTestState';

vi.mock('next/router', () => ({
  useRouter: () => ({ pathname: sidebarNavigationTestState.pathname }),
}));

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));

vi.mock('next-translate/Trans', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(sidebarNavigationTestState.store),
  useDispatch: () => vi.fn(),
  shallowEqual: (left: unknown, right: unknown) => left === right,
}));

vi.mock('@/utils/eventLogger', () => ({
  logButtonClick: vi.fn(),
  logEvent: vi.fn(),
  logValueChange: vi.fn(),
}));

vi.mock('@/utils/responsive', () => ({ isMobile: () => false }));

vi.mock('@/hooks/useOutsideClickDetector', () => ({ default: () => {} }));

vi.mock('./SidebarNavigationSelections', () => ({
  default: () => <div data-testid="sidebar-selections" />,
}));

vi.mock('@/components/QuranReader/RevelationOrderNavigationNotice', () => ({
  default: () => null,
  RevelationOrderNavigationNoticeView: {
    SideDrawer: 'side-drawer',
    EndOfScrollingControls: 'end-of-scrolling-controls',
  },
}));

vi.mock('@/icons/close.svg', () => ({ default: () => <svg /> }));

afterEach(() => {
  cleanup();
});

describe('SidebarNavigation homepage styling', () => {
  it.each([
    { pathname: '/quran', expected: 'true' },
    { pathname: '/[chapterId]', expected: 'false' },
    { pathname: '/', expected: 'false' },
  ])('should set data-is-homepage=$expected on $pathname', ({ pathname, expected }) => {
    setSidebarNavigationTestPathname(pathname);
    // DLS buttons render inside a Radix Tooltip: provide the tooltip context
    // exactly as `_app.tsx` does.
    const { container } = render(
      <TooltipProvider>
        <SidebarNavigation />
      </TooltipProvider>,
    );
    expect(container.querySelector('[data-is-homepage]')?.getAttribute('data-is-homepage')).toBe(
      expected,
    );
  });
});
