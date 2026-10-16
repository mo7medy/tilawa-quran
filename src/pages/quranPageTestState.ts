/**
 * Hoisted, typed page state for `quran.test.tsx`.
 *
 * The `vi.mock` factories in the test run before its own top-level
 * initializers, so mocked hooks (`isLoggedIn`, `isMobile`, …) read from this
 * imported module (evaluated first) instead of untyped `globalThis` buckets.
 */

interface QuranPageTestSeoProps {
  title?: string;
  description?: string;
  url?: string;
  languageAlternates?: { hrefLang: string; href: string }[];
}

interface QuranPageTestState {
  loggedIn: boolean;
  isMobile: boolean;
  todayAyah: { chapterId: number } | null;
  seoProps: QuranPageTestSeoProps | null;
}

const DEFAULT_STATE: QuranPageTestState = {
  loggedIn: false,
  isMobile: false,
  todayAyah: { chapterId: 1 },
  seoProps: null,
};

export const quranPageTestState: QuranPageTestState = { ...DEFAULT_STATE };

/**
 * Point the mocked Quran homepage inputs at a scenario.
 *
 * @param {Partial<Omit<QuranPageTestState, 'seoProps'>>} scenario branch inputs
 * @returns {void}
 */
export const setQuranPageTestScenario = (
  scenario: Partial<Omit<QuranPageTestState, 'seoProps'>>,
): void => {
  Object.assign(quranPageTestState, scenario);
};

/**
 * Reset scenario inputs and captured SEO props between tests.
 *
 * @returns {void}
 */
export const resetQuranPageTestState = (): void => {
  Object.assign(quranPageTestState, DEFAULT_STATE);
};
