import React from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  academyTestRouterState,
  setAcademyTestRoute,
} from '../../components/Academy/academyTestRouter';
import TeachersPage from '../../pages/teachers';

vi.mock('next/router', () => ({
  useRouter: () => ({
    locale: academyTestRouterState.lang,
    defaultLocale: 'en',
    locales: academyTestRouterState.locales,
    pathname: academyTestRouterState.pathname,
    asPath: academyTestRouterState.asPath,
  }),
}));

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({
    t: (key: string) => key,
    lang: academyTestRouterState.lang,
  }),
}));

vi.mock('@/components/NextSeoWrapper', () => ({
  default: (props: { url?: string }) => {
    academyTestRouterState.seoUrl = props.url;
    return null;
  },
}));

afterEach(() => {
  cleanup();
});

describe.each(['en', 'ar'] as const)('Teachers page in %s', (lang) => {
  it('should render the standalone directory with clearly labelled preview profiles', () => {
    setAcademyTestRoute(lang, '/teachers', lang === 'ar' ? '/ar/teachers' : '/teachers');
    const { container } = render(<TeachersPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(container.querySelectorAll('[data-testid="teacher-preview-badge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid="teachers-directory"]')).toHaveLength(1);
    expect(academyTestRouterState.seoUrl).toContain('/teachers');
  });
});
