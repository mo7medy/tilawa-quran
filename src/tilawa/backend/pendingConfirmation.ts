import { authDestination } from './authDestination';
import { safeAccountRedirect } from './redirect';

interface PendingConfirmation {
  email: string;
  next: string;
  sentAt: number;
}

const STORAGE_KEY = 'tilawa-pending-confirmation';
export const CONFIRMATION_COOLDOWN = 60;

export const savePendingConfirmation = (email: string, next: string): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, next, sentAt: Date.now() }));
  } catch {
    // The waiting page still works when browser storage is unavailable.
  }
};

export const readPendingConfirmation = (): PendingConfirmation | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (
      typeof value?.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
      typeof value.next !== 'string' ||
      !Number.isFinite(value.sentAt) ||
      Date.now() - value.sentAt > 3600000
    ) {
      return null;
    }
    return { email: value.email, next: safeAccountRedirect(value.next), sentAt: value.sentAt };
  } catch {
    return null;
  }
};

export const confirmationPagePath = (next: unknown, locale?: string | null): string =>
  `/auth/check-email?${new URLSearchParams({ next: authDestination(next, locale) })}`;
