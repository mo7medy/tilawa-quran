import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AcademyAccountMenu from './AcademyAccountMenu';

const account = vi.hoisted(() => ({
  userId: 'student',
  state: { student: { name: 'Mohamed', photo: '' } },
  snapshot: { teacher: null, isAdmin: false },
}));
vi.mock('@/components/Account/AccountContext', () => ({
  useOptionalAccountPreview: () => account,
}));
vi.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ lang: 'en', t: (key: string) => key }),
}));
afterEach(cleanup);

describe('Account dropdown link semantics', () => {
  it('retains menu roles, focus and destinations through the shared link', async () => {
    render(<AcademyAccountMenu />);
    const trigger = screen.getByRole('button', { name: 'profile-ui.account-menu' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const overview = await screen.findByRole('menuitem', { name: 'learning' });
    expect(overview.getAttribute('href')).toBe('/profile/learning');
    expect(screen.getByRole('menuitem', { name: 'profile' }).getAttribute('href')).toBe('/profile');
    expect(screen.getByRole('menuitem', { name: 'settings' }).getAttribute('href')).toBe(
      '/profile/settings',
    );
    expect(screen.queryByRole('menuitem', { name: 'admin.title' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(overview));
    fireEvent.keyDown(overview, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'profile' })),
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
