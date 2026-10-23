import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TeachersDirectory from './TeachersDirectory';

const read = vi.hoisted(() => ({
  data: undefined,
  error: undefined as Error | undefined,
  isValidating: false,
  mutate: vi.fn(),
}));
vi.mock('swr', () => ({ default: () => read }));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ lang: 'en', t: (key: string) => key }),
}));
vi.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  read.data = undefined;
  read.error = undefined;
  read.isValidating = false;
  read.mutate.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('Teacher directory request states', () => {
  it('shows loading without claiming that the directory is empty', () => {
    read.isValidating = true;
    render(<TeachersDirectory />);
    expect(screen.getByRole('status', { name: 'teachers.loading' })).toBeDefined();
    expect(screen.queryByTestId('teachers-empty-state')).toBeNull();
  });

  it('offers retry on failure without showing an empty-directory message', () => {
    read.error = new Error('Request failed');
    render(<TeachersDirectory />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.queryByTestId('teachers-empty-state')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'admin-console.retry' }));
    expect(read.mutate).toHaveBeenCalledOnce();
  });
});
