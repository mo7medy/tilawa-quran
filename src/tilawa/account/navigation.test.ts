import { describe, expect, it } from 'vitest';

import {
  isAccountLinkActive,
  STUDENT_ACCOUNT_GROUPS,
  STUDENT_ACCOUNT_LINKS,
  TEACHER_ACCOUNT_GROUPS,
} from './navigation';

describe('Shared account navigation', () => {
  it('keeps communication and settings reachable exactly once for each role', () => {
    [STUDENT_ACCOUNT_GROUPS, TEACHER_ACCOUNT_GROUPS].forEach((groups) => {
      const links = groups.flatMap((group) => group.links);
      ['/profile/messages', '/profile/notifications', '/profile/settings'].forEach((href) => {
        expect(links.filter((link) => link.href === href)).toHaveLength(1);
      });
      expect(new Set(links.map((link) => link.href)).size).toBe(links.length);
    });
  });

  it('selects only the most specific teaching section on a nested request', () => {
    const links = TEACHER_ACCOUNT_GROUPS.flatMap((group) => group.links);
    const selected = links.filter((link) =>
      isAccountLinkActive('/dashboard/teacher/requests/request-1', link.href, links),
    );
    expect(selected.map((link) => link.key)).toEqual(['requests']);
  });

  it('does not select personal information for every account page', () => {
    expect(isAccountLinkActive('/profile/messages', '/profile', STUDENT_ACCOUNT_LINKS)).toBe(false);
    expect(isAccountLinkActive('/profile', '/profile', STUDENT_ACCOUNT_LINKS)).toBe(true);
    expect(isAccountLinkActive('/profile/teachers', '/teachers', STUDENT_ACCOUNT_LINKS)).toBe(
      false,
    );
  });
});
