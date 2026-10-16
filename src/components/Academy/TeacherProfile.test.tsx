import React from 'react';

import { act } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import I18nProvider from 'next-translate/I18nProvider';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ar from '../../../locales/ar/academy.json';
import en from '../../../locales/en/academy.json';
import SAMPLE_TEACHERS from '../../tilawa/teacherSamples';

import { academyTestRouterState, setAcademyTestRoute } from './academyTestRouter';
import TeacherProfile from './TeacherProfile';

vi.mock('next/router', () => ({ useRouter: () => ({ locale: academyTestRouterState.lang }) }));
// eslint-disable-next-line no-underscore-dangle
process.env.__NEXT_I18N_SUPPORT = 'true';

describe.each(['en', 'ar'] as const)('Public profile in %s', (locale) => {
  it('hydrates stable localized content and preserves locale on its directory link', async () => {
    setAcademyTestRoute(locale, '/teachers/[slug]', `/teachers/${SAMPLE_TEACHERS[0].slug}`);
    const router = {
      locale,
      defaultLocale: 'en',
      locales: ['en', 'ar'],
      isLocaleDomain: false,
    } as unknown as NextRouter;
    const view = (
      <RouterContext.Provider value={router}>
        <I18nProvider lang={locale} namespaces={{ academy: locale === 'ar' ? ar : en }}>
          <TeacherProfile teacher={SAMPLE_TEACHERS[0]} referenceDate="2026-10-14" />
        </I18nProvider>
      </RouterContext.Provider>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(view);
    document.body.append(container);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      expect(container.querySelector('h1')?.textContent).toBe(
        locale === 'ar' ? 'معلّم توضيحي أ' : 'Sample teacher A',
      );
      expect(container.querySelector('a')?.getAttribute('href')).toBe(
        locale === 'ar' ? '/ar/teachers' : '/teachers',
      );
      expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
      expect(container.querySelector('#languages')).not.toBeNull();
      expect(container.querySelector('#lesson-ratings')).not.toBeNull();
      expect(container.textContent).toContain(
        locale === 'ar' ? 'لجميع الأعمار' : 'All ages welcome',
      );
      expect(container.querySelector('a a, a button')).toBeNull();
      await act(async () => {
        root = hydrateRoot(container, view);
      });
      expect(errors.mock.calls.flat().join(' ')).not.toMatch(
        /hydration|mismatch|validateDOMNesting/i,
      );
    } finally {
      if (root) {
        await act(async () => {
          root.unmount();
        });
      }
      errors.mockRestore();
      container.remove();
    }
  });
});
