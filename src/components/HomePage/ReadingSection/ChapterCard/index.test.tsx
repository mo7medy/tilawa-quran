import React from 'react';

import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ChapterCard from './index';

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('next/router', () => ({ useRouter: () => ({ locale: 'ar' }) }));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'ar' }),
}));
vi.mock('@/utils/chapter', () => ({
  getChapterData: () => ({ transliteratedName: 'الفاتحة', translatedName: 'الفاتحة' }),
}));
vi.mock('@/utils/locale', () => ({
  toLocalizedNumber: (value: number) => String(value),
  getDir: () => 'rtl',
}));
vi.mock('@/utils/navigation', () => ({
  getChapterWithStartingVerseUrl: (key: string) => `/verse/${key}`,
  getPageNavigationUrl: (page: number) => `/page/${page}`,
}));
vi.mock('@/utils/eventLogger', () => ({ logButtonClick: vi.fn() }));
vi.mock('@/icons/arrow.svg', () => ({ default: () => <svg /> }));

describe('ChapterCard server markup', () => {
  it.each([false, true])(
    'hydrates with one reading link (continue=%s)',
    async (isContinueReading) => {
      const card = (
        <ChapterCard surahNumber={1} verseNumber={2} isContinueReading={isContinueReading} />
      );
      const container = document.createElement('div');
      container.innerHTML = renderToString(card);
      document.body.append(container);
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot>;
      try {
        // HTML parsing must preserve the original card rather than split nested anchors.
        expect(container.querySelectorAll('a')).toHaveLength(1);
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/verse/1:2');
        await act(async () => {
          root = hydrateRoot(container, card);
        });
        expect(errors.mock.calls.flat().join(' ')).not.toMatch(/hydration|validateDOMNesting/i);
        expect(container.querySelector('a a, a button')).toBeNull();
      } finally {
        if (root) await act(async () => root.unmount());
        errors.mockRestore();
        container.remove();
      }
    },
  );
});
