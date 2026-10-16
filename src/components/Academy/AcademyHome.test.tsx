import React from 'react';

/* eslint-disable max-lines, react-func/max-lines-per-function */
import { act } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import arAcademy from '../../../locales/ar/academy.json';
import arCommon from '../../../locales/ar/common.json';
import enAcademy from '../../../locales/en/academy.json';
import enCommon from '../../../locales/en/common.json';

import AcademyHome from './AcademyHome';
import AcademyShell from './AcademyShell';
import { academyTestRouterState, setAcademyTestRoute } from './academyTestRouter';

// Next's SVG loader produces a component; Vitest's asset loader produces a URL.
vi.mock('@/icons/arrow-right.svg', () => ({
  default: () => <svg aria-hidden="true" />,
}));

// Mirror the Next.js runtime: locale prefixing (`addLocale`) only applies
// when i18n support is enabled, which Next sets for this app (`i18n.json`).
// Without this, `next/link` renders unprefixed hrefs even with a locale.
// eslint-disable-next-line no-underscore-dangle
process.env.__NEXT_I18N_SUPPORT = 'true';

type LocaleDict = Record<string, unknown>;

// Typed, hoisted router state (see `academyTestRouter.ts`): `vi.mock`
// factories run before module-level initializers, so plain top-level
// variables would hit the temporal dead zone.
vi.mock('next/router', () => ({
  useRouter: () => ({
    locale: academyTestRouterState.lang,
    defaultLocale: 'en',
    locales: academyTestRouterState.locales,
    pathname: academyTestRouterState.pathname,
    asPath: academyTestRouterState.asPath,
  }),
}));

// Academy components call `useTranslation('academy')` for page copy and
// `useTranslation('common')` for the shared `tilawa` brand string. Mirror the
// runtime merge (page namespace wins) so assertions see real localized copy.
const dictionaries: Record<string, LocaleDict> = {
  en: { ...(enCommon as LocaleDict), ...(enAcademy as LocaleDict) },
  ar: { ...(arCommon as LocaleDict), ...(arAcademy as LocaleDict) },
};

vi.mock('next-translate/useTranslation', () => ({
  default: () => {
    const dictionary = dictionaries[academyTestRouterState.lang] ?? dictionaries.en;
    return {
      t: (key: string) => lookup(dictionary, key),
      lang: academyTestRouterState.lang,
    };
  },
}));

const lookup = (dictionary: LocaleDict, key: string): string => {
  const parts = key.split('.');
  let current: unknown = dictionary;
  let index = 0;
  while (index < parts.length) {
    if (current === null || typeof current !== 'object') {
      return key;
    }
    current = (current as Record<string, unknown>)[parts[index]];
    index += 1;
  }
  return typeof current === 'string' ? current : key;
};

const renderAcademyRoute = () => {
  // Real Next.js router context (default locale `en`, like `i18n.json`) so
  // `next/link` resolves locale prefixes exactly as in the browser. The
  // values track the hoisted test state, set per test via `setAcademyTestRoute`.
  const routerContext = {
    locale: academyTestRouterState.lang,
    defaultLocale: 'en',
    locales: academyTestRouterState.locales,
    pathname: academyTestRouterState.pathname,
    asPath: academyTestRouterState.asPath,
    isLocaleDomain: false,
  } as unknown as NextRouter;
  return (
    <RouterContext.Provider value={routerContext}>
      <AcademyShell>
        <AcademyHome />
      </AcademyShell>
    </RouterContext.Provider>
  );
};

const hrefsIn = (container: HTMLElement): (string | null)[] =>
  Array.from(container.querySelectorAll('a')).map((anchor) => anchor.getAttribute('href'));

const assertSemanticLinks = (container: HTMLElement, localePrefix: string): void => {
  // Every route link keeps the visitor inside the active locale.
  const hrefs = hrefsIn(container);
  expect(hrefs).toContain(`${localePrefix}/teachers`);
  expect(hrefs).toContain(`${localePrefix}/quran`);
  expect(hrefs).toContain(`${localePrefix}/sign-in`);
  expect(hrefs).toContain(`${localePrefix}/pricing`);
  expect(hrefs).toContain(`${localePrefix}/register`);
  expect(hrefs).toContain(localePrefix === '' ? '/#programs' : `${localePrefix}#programs`);
};

const assertRequiredSections = (container: HTMLElement): void => {
  expect(container.querySelector('#programs')).not.toBeNull();
  expect(container.querySelector('#teachers')).not.toBeNull();
  expect(container.querySelector('#how-it-works')).not.toBeNull();
  expect(container.querySelector('#faq')).not.toBeNull();
};

const hydrateAndAssertClean = async (container: HTMLElement, route: JSX.Element): Promise<void> => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    expect(container.querySelector('a a, a button')).toBeNull();
    await act(async () => {
      root = hydrateRoot(container, route);
    });
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/hydration|validateDOMNesting/i);
  } finally {
    if (root) await act(async () => root.unmount());
    errors.mockRestore();
  }
};

describe('Academy route in English', () => {
  it('should hydrate cleanly with unprefixed locale links and a language switch', async () => {
    setAcademyTestRoute('en', '/', '/');
    const route = renderAcademyRoute();
    const container = document.createElement('div');
    container.innerHTML = renderToString(route);
    document.body.append(container);
    try {
      expect(container.querySelector('h1')?.textContent).toBe(
        lookup(dictionaries.en, 'hero.title'),
      );
      assertSemanticLinks(container, '');
      assertRequiredSections(container);

      const previewBadges = container.querySelectorAll('[data-testid="teacher-preview-badge"]');
      expect(previewBadges).toHaveLength(3);
      expect(previewBadges[0].textContent).toContain(
        lookup(dictionaries.en, 'teachers.sample-profile'),
      );

      // Localized brand + nav label (real copy, not mock strings).
      expect(container.querySelector('[data-testid="academy-header"]')?.textContent).toContain(
        lookup(dictionaries.en, 'tilawa'),
      );
      expect(container.querySelector('[data-testid="academy-footer"]')?.textContent).toContain(
        lookup(dictionaries.en, 'tilawa'),
      );
      expect(
        container.querySelector('[data-testid="academy-header"] nav')?.getAttribute('aria-label'),
      ).toBe(lookup(dictionaries.en, 'nav-label'));

      // Language switch keeps the current route and offers Arabic only
      // (`fr` is not an academy locale and English is already active).
      const languageSwitch = container.querySelector('[data-testid="academy-language-switch"]');
      expect(languageSwitch).not.toBeNull();
      const switchLinks = Array.from(languageSwitch?.querySelectorAll('a') ?? []);
      expect(switchLinks).toHaveLength(1);
      expect(switchLinks[0].getAttribute('href')).toBe('/ar');
      expect(switchLinks[0].textContent).toBe('العربية');

      await hydrateAndAssertClean(container, route);
    } finally {
      container.remove();
    }
  });

  it('should render all five program cards with real localized copy', () => {
    setAcademyTestRoute('en', '/', '/');
    const html = renderToString(<AcademyHome />);
    // Server markup escapes `&` as `&amp;`; mirror that in expectations.
    const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;');
    const programs = ['memorization', 'tajweed', 'arabic', 'revision', 'fiqh'];
    programs.forEach((program) => {
      expect(html).toContain(
        escapeHtml(lookup(dictionaries.en, `programs.items.${program}.title`)),
      );
    });
    expect(html).toContain(escapeHtml(lookup(dictionaries.en, 'faq.title')));
  });
});

describe('Academy route in Arabic', () => {
  it('should hydrate cleanly with /ar-prefixed links and a switch back to English', async () => {
    setAcademyTestRoute('ar', '/', '/ar');
    const route = renderAcademyRoute();
    const container = document.createElement('div');
    container.innerHTML = renderToString(route);
    document.body.append(container);
    try {
      expect(container.querySelector('h1')?.textContent).toBe(
        lookup(dictionaries.ar, 'hero.title'),
      );
      assertSemanticLinks(container, '/ar');
      assertRequiredSections(container);

      const previewBadges = container.querySelectorAll('[data-testid="teacher-preview-badge"]');
      expect(previewBadges).toHaveLength(3);
      expect(previewBadges[0].textContent).toContain(
        lookup(dictionaries.ar, 'teachers.sample-profile'),
      );

      expect(container.querySelector('[data-testid="academy-header"]')?.textContent).toContain(
        lookup(dictionaries.ar, 'tilawa'),
      );
      expect(
        container.querySelector('[data-testid="academy-header"] nav')?.getAttribute('aria-label'),
      ).toBe(lookup(dictionaries.ar, 'nav-label'));

      // Switch retains the current route (`/ar` -> `/`) and offers English.
      const languageSwitch = container.querySelector('[data-testid="academy-language-switch"]');
      expect(languageSwitch).not.toBeNull();
      const switchLinks = Array.from(languageSwitch?.querySelectorAll('a') ?? []);
      expect(switchLinks).toHaveLength(1);
      expect(switchLinks[0].getAttribute('href')).toBe('/');
      expect(switchLinks[0].textContent).toBe('English');

      await hydrateAndAssertClean(container, route);
    } finally {
      container.remove();
    }
  });

  it('should keep Arabic locale on the teachers route and its switch target', () => {
    setAcademyTestRoute('ar', '/teachers', '/ar/teachers');
    const container = document.createElement('div');
    container.innerHTML = renderToString(renderAcademyRoute());
    document.body.append(container);
    try {
      // Header/footer/CTA links keep /ar prefix even off the homepage.
      assertSemanticLinks(container, '/ar');
      // Switch from /ar/teachers returns to /teachers (same route, English).
      const switchLink = container.querySelector('[data-testid="academy-language-switch"] a');
      expect(switchLink?.getAttribute('href')).toBe('/teachers');
    } finally {
      container.remove();
    }
  });

  it('should render all five program cards with real localized copy', () => {
    setAcademyTestRoute('ar', '/', '/ar');
    const html = renderToString(<AcademyHome />);
    const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;');
    const programs = ['memorization', 'tajweed', 'arabic', 'revision', 'fiqh'];
    programs.forEach((program) => {
      expect(html).toContain(
        escapeHtml(lookup(dictionaries.ar, `programs.items.${program}.title`)),
      );
    });
    expect(html).toContain(escapeHtml(lookup(dictionaries.ar, 'faq.title')));
  });
});
