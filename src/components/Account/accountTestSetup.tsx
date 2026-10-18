/* eslint-disable import/no-extraneous-dependencies -- Local test harness. */
import type { AnchorHTMLAttributes } from 'react';

import { vi } from 'vitest';

import ar from '../../../locales/ar/account.json';
import en from '../../../locales/en/account.json';

export const accountTestRoute = {
  pathname: '/profile',
  asPath: '/profile',
  query: {} as Record<string, string | string[]>,
  locale: 'en',
};
export const routeAccount = (
  area: 'profile' | 'teacher' | 'lesson',
  section: string[] = [],
  locale = 'en',
): void => {
  accountTestRoute.locale = locale;
  accountTestRoute.pathname = {
    teacher: '/dashboard/teacher/[[...section]]',
    lesson: '/lessons/[lessonId]',
    profile: '/profile',
  }[area];
  accountTestRoute.asPath =
    area === 'teacher'
      ? `/dashboard/teacher/${section.join('/')}`
      : `/profile/${section.join('/')}`;
  accountTestRoute.query = area === 'lesson' ? { lessonId: section[0] } : { section };
};
vi.mock('next/router', () => ({ useRouter: () => accountTestRoute }));
vi.mock('next/link', () => ({
  default: ({
    locale,
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { locale?: string }) => (
    <a {...props} href={href} data-locale={locale} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  ),
}));
vi.mock('../NextSeoWrapper', () => ({ default: () => null }));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({
    lang: accountTestRoute.locale,
    t: (key: string, params: Record<string, unknown> = {}) => {
      let value: unknown = accountTestRoute.locale === 'ar' ? ar : en;
      key.split('.').forEach((part) => {
        value = value && typeof value === 'object' ? value[part] : undefined;
      });
      return typeof value === 'string'
        ? value.replace(/\{\{(\w+)\}\}/g, (match, name: string) => String(params[name]))
        : key;
    },
  }),
}));
