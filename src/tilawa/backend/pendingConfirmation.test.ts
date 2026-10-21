import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  confirmationPagePath,
  readPendingConfirmation,
  savePendingConfirmation,
} from './pendingConfirmation';

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Pending email confirmation', () => {
  it('keeps email in session storage and excludes it from the waiting-page URL', () => {
    savePendingConfirmation('learner@example.com', '/profile/teacher');
    expect(readPendingConfirmation()).toMatchObject({
      email: 'learner@example.com',
      next: '/profile/teacher',
    });
    const url = new URL(confirmationPagePath('/profile/teacher', 'ar'), 'https://tilawa.example');
    expect(url.pathname).toBe('/auth/check-email');
    expect(url.searchParams.get('next')).toBe('/ar/profile/teacher');
    expect(url.searchParams.has('email')).toBe(false);
  });
  it('rejects external return paths and stale or malformed stored state', () => {
    expect(confirmationPagePath('//untrusted.example', 'ar')).toContain('next=%2Far%2Fprofile');
    savePendingConfirmation('learner@example.com', '/profile');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3600001);
    expect(readPendingConfirmation()).toBeNull();
    sessionStorage.setItem('tilawa-pending-confirmation', '{broken');
    expect(readPendingConfirmation()).toBeNull();
  });
  it('works without storage access', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => savePendingConfirmation('learner@example.com', '/profile')).not.toThrow();
    expect(readPendingConfirmation()).toBeNull();
  });
});
