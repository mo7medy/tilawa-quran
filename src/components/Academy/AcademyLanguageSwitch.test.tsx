import React from 'react';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import setLanguage from 'next-translate/setLanguage';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18nConfig from '../../../i18n.json';

import AcademyLanguageSwitch from './AcademyLanguageSwitch';

import { clearLocaleCookie, getLocaleCookie, setLocaleCookie } from '@/utils/cookies';

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'nl' }),
}));
vi.mock('next-translate/setLanguage', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/icons/globe.svg', () => ({ default: () => <svg aria-hidden="true" /> }));
vi.mock('@/utils/cookies', () => ({
  setLocaleCookie: vi.fn(),
  getLocaleCookie: vi.fn(),
  clearLocaleCookie: vi.fn(),
}));
vi.mock('@/utils/auth/login', () => ({ isLoggedIn: () => false }));
vi.mock('@/utils/auth/api', () => ({ addOrUpdateUserPreference: vi.fn() }));
vi.mock('@/utils/eventLogger', () => ({ logValueChange: vi.fn() }));
vi.mock('@/dls/Toast/Toast', () => ({
  ToastStatus: { Error: 'error', Warning: 'warning' },
  useToast: () => mocks.toast,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Shared globe language control', () => {
  it('opens the reader locale list and closes with Escape, restoring focus', async () => {
    render(<AcademyLanguageSwitch />);
    const trigger = screen.getByRole('button', { name: 'languages' });
    expect(trigger.querySelector('svg')).not.toBeNull();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'select-language' });
    expect(dialog.querySelectorAll('[data-testid^="language-item-"]')).toHaveLength(
      i18nConfig.locales.length,
    );
    expect(screen.getByTestId('language-item-nl').getAttribute('aria-current')).toBe('true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('changes and persists language through the shared handler without a Quran store', async () => {
    const onNavigate = vi.fn();
    render(<AcademyLanguageSwitch onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'languages' }));
    fireEvent.click(screen.getByTestId('language-item-ar'));
    await waitFor(() => expect(setLanguage).toHaveBeenCalledWith('ar'));
    expect(setLocaleCookie).toHaveBeenCalledWith('ar');
    expect(vi.mocked(setLocaleCookie).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(setLanguage).mock.invocationCallOrder[0],
    );
    expect(onNavigate).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the picker available and rolls back a failed language change', async () => {
    vi.mocked(setLanguage).mockRejectedValueOnce(new Error('Navigation failed'));
    render(<AcademyLanguageSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'languages' }));
    fireEvent.click(screen.getByTestId('language-item-en'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(setLocaleCookie).toHaveBeenCalledWith('en');
    expect(clearLocaleCookie).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByTestId('language-item-en').hasAttribute('disabled')).toBe(false);
  });

  it('restores the saved preference when navigation is cancelled', async () => {
    vi.mocked(getLocaleCookie).mockReturnValueOnce('ar');
    vi.mocked(setLanguage).mockResolvedValueOnce(false);
    render(<AcademyLanguageSwitch />);
    fireEvent.click(screen.getByRole('button', { name: 'languages' }));
    fireEvent.click(screen.getByTestId('language-item-en'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(setLocaleCookie).toHaveBeenNthCalledWith(1, 'en');
    expect(setLocaleCookie).toHaveBeenNthCalledWith(2, 'ar');
    expect(clearLocaleCookie).not.toHaveBeenCalled();
  });
});
