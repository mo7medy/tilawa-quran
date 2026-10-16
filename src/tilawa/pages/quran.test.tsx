import React from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import type { GetStaticPropsContext } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import QuranPage, { getStaticProps } from '../../pages/quran';

import {
  quranPageTestState,
  resetQuranPageTestState,
  setQuranPageTestScenario,
} from './quranPageTestState';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
vi.mock('@/components/NextSeoWrapper', () => ({
  default: (props: { url?: string; languageAlternates?: unknown }) => {
    quranPageTestState.seoProps = {
      url: props.url,
      languageAlternates: props.languageAlternates as
        | { hrefLang: string; href: string }[]
        | undefined,
    };
    return null;
  },
}));
vi.mock('@/components/HomePage/HomePageHero', () => ({
  default: () => <div data-testid="quran-hero" />,
}));
vi.mock('@/components/HomePage/ReadingSection', () => ({
  default: () => <div data-testid="quran-reading" />,
}));
vi.mock('@/components/HomePage/LearningPlansSection', () => ({
  default: () => <div data-testid="quran-learning-plans" />,
}));
vi.mock('@/components/HomePage/QuranInYearSection', () => ({
  default: () => <div data-testid="quran-in-year" />,
}));
vi.mock('@/components/HomePage/ExploreTopicsSection', () => ({
  default: () => <div data-testid="quran-explore" />,
}));
vi.mock('@/components/HomePage/MobileHomepageSections', () => ({
  default: (props: { isUserLoggedIn: boolean }) => (
    <div data-testid="quran-mobile" data-logged-in={String(props.isUserLoggedIn)} />
  ),
}));
vi.mock('@/components/chapters/ChapterAndJuzList', () => ({
  default: () => <div data-testid="quran-chapter-list" />,
}));
vi.mock('@/utils/auth/login', () => ({
  isLoggedIn: () => quranPageTestState.loggedIn,
}));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    get matches(): boolean {
      return quranPageTestState.isMobile;
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
vi.mock('@/utils/quranInYearCalendar', () => ({
  default: () => quranPageTestState.todayAyah,
}));
vi.mock('@/utils/chapter', () => ({
  getAllChaptersData: async () => ({
    '1': { transliteratedName: 'Al-Fatihah', translatedName: 'The Opener' },
  }),
}));
vi.mock('@/utils/locale', () => ({
  getLanguageAlternates: (path: string) => [{ hrefLang: 'en', href: path }],
}));
vi.mock('@/utils/navigation', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    getCanonicalUrl: (lang: string, path: string) => `https://tilawa.test${path}`,
  };
});

// Minimal props: the page only reads chaptersResponse.chapters + chaptersData
// at render, and getStaticProps maps chapter entries with their numeric id.
const baseProps: React.ComponentProps<typeof QuranPage> = {
  chaptersResponse: {
    chapters: [{ id: 1, transliteratedName: 'Al-Fatihah', translatedName: 'The Opener' }],
  },
  chaptersData: { '1': { transliteratedName: 'Al-Fatihah', translatedName: 'The Opener' } },
} as unknown as React.ComponentProps<typeof QuranPage>;

afterEach(() => {
  cleanup();
  resetQuranPageTestState();
  vi.unstubAllGlobals();
});

describe('Preserved Quran homepage at /quran', () => {
  it('should keep getStaticProps chapter mapping behavior unchanged', async () => {
    const context = { locale: 'en' } as unknown as GetStaticPropsContext;
    const result = (await getStaticProps(context)) as unknown as {
      props: {
        chaptersData: Record<string, { transliteratedName: string }>;
        chaptersResponse: { chapters: { id: number }[] };
      };
    };
    expect(result.props.chaptersData['1'].transliteratedName).toBe('Al-Fatihah');
    expect(result.props.chaptersResponse.chapters).toEqual([
      { id: 1, transliteratedName: 'Al-Fatihah', translatedName: 'The Opener' },
    ]);
  });

  it('should point SEO canonical and alternates at /quran', () => {
    render(<QuranPage {...baseProps} />);
    expect(quranPageTestState.seoProps?.url).toBe('https://tilawa.test/quran');
    expect(quranPageTestState.seoProps?.languageAlternates).toEqual([
      { hrefLang: 'en', href: '/quran' },
    ]);
  });

  it('should render the logged-out desktop branch (explore, learning, year, lists)', () => {
    setQuranPageTestScenario({ loggedIn: false, isMobile: false });
    const { container } = render(<QuranPage {...baseProps} />);
    expect(screen.getByTestId('quran-hero')).toBeDefined();
    expect(screen.getByTestId('quran-reading')).toBeDefined();
    expect(screen.getByTestId('quran-explore')).toBeDefined();
    expect(screen.getByTestId('quran-learning-plans')).toBeDefined();
    expect(screen.getByTestId('quran-in-year')).toBeDefined();
    expect(screen.getByTestId('quran-chapter-list')).toBeDefined();
    // Logged-out order: explore topics come before learning plans.
    const html = container.innerHTML;
    expect(html.indexOf('quran-explore')).toBeLessThan(html.indexOf('quran-learning-plans'));
  });

  it('should render the logged-in desktop branch (learning before explore)', () => {
    setQuranPageTestScenario({ loggedIn: true, isMobile: false });
    const { container } = render(<QuranPage {...baseProps} />);
    expect(screen.getByTestId('quran-learning-plans')).toBeDefined();
    expect(screen.getByTestId('quran-in-year')).toBeDefined();
    const html = container.innerHTML;
    expect(html.indexOf('quran-learning-plans')).toBeLessThan(html.indexOf('quran-explore'));
  });

  it('should render the mobile branch with login state passed through', () => {
    setQuranPageTestScenario({ loggedIn: true, isMobile: true });
    render(<QuranPage {...baseProps} />);
    expect(screen.getByTestId('quran-mobile').getAttribute('data-logged-in')).toBe('true');
    expect(screen.queryByTestId('quran-explore')).toBeNull();
  });
});
