/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
/* eslint-disable import/prefer-default-export -- Named domain helpers form the account preview contract. */
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import { money } from '../../tilawa/account/rules';
import type { AccountRole } from '../../tilawa/account/types';

import { useAccountPreview } from './AccountPreviewProvider';

export const useAccountUi = () => {
  const router = useRouter();
  const { t: translate, lang } = useTranslation('account');
  const account = useAccountPreview();
  const { state, dispatch, backend } = account;
  const liveLabels: Record<string, string> = {
    saved: 'saved-live',
    'photo-hint': 'photo-live-hint',
    'save-preview': 'save',
    'confirm-preview': 'confirm',
    'send-preview': 'send',
    'preview-steps': 'confirm',
    'preview-renewal': 'renewal-details',
    'renewal-note': 'renewal-live-note',
    'preview-withdrawal': 'request-withdrawal',
    'withdrawal-preview-created': 'withdrawal-created',
    'security-description': 'security-live-description',
  };
  const t: typeof translate = (key, ...args) =>
    translate(backend && typeof key === 'string' ? liveLabels[key] ?? key : key, ...args);
  const teacherRoute =
    router.pathname.startsWith('/dashboard/teacher') ||
    router.asPath.split('?')[0].endsWith('/profile/teacher');
  let role: AccountRole = 'student';
  if (backend) {
    if (router.pathname.startsWith('/lessons/')) {
      if (
        state.lessons.find((lesson) => lesson.id === router.query.lessonId)?.teacherId ===
        account.userId
      ) {
        role = 'teacher';
      }
    } else if (
      teacherRoute ||
      (account.snapshot?.teacher &&
        !/\/profile\/(student|learning|lessons|teachers|packages)/.test(router.asPath))
    ) {
      role = 'teacher';
    }
  } else if (router.query.preview === 'teacher' || teacherRoute) role = 'teacher';
  const href = (path: string): string =>
    backend ? path : `${path}${path.includes('?') ? '&' : '?'}preview=${role}`;
  const query = { ...router.query };
  delete query.preview;
  delete query.view;
  return {
    ...account,
    t,
    lang,
    router: backend ? { ...router, query } : router,
    state,
    dispatch,
    role,
    href,
    price: (cents: number): string => money(cents, lang),
    teacherFor: (id: string) =>
      state.teachers?.find((teacher) => teacher.publicProfile.id === id) ?? state.teacher,
    studentFor: (id: string) =>
      state.students?.find((student) => student.id === id) ?? state.student,
  };
};
