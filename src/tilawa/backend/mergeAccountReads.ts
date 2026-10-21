/* eslint-disable import/prefer-default-export -- Named domain helper matches the backend read contracts. */
import { rows } from './rows';
import type { Row } from './rows';

/** Section reads cannot replace the authenticated owner's identity or permissions.
 * @returns {Row} section content with the authoritative bootstrap identity
 */
export const mergeAccountReads = (base: Row, section: Row = {}): Row => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(section).filter(
      ([key]) =>
        ![
          'profile',
          'student',
          'teacher',
          'contacts',
          'email',
          'hasPassword',
          'settings',
          'isAdmin',
          'adminVerified',
          'balances',
          'unreadNotifications',
          'unreadMessages',
        ].includes(key),
    ),
  ),
  teachers: Array.from(
    new Map(
      [...rows(section.teachers), ...rows(base.teachers)].map((teacher) => [
        teacher.user_id,
        teacher,
      ]),
    ).values(),
  ),
});
