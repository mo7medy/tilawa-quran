import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AccountContext } from './AccountContext';
import { routeAccount } from './accountTestSetup';
import StudentPackages from './StudentPackages';

import { createAccountFixtures } from '@/tilawa/account/fixtures';

afterEach(cleanup);

describe('Subscription details', () => {
  it.each(['en', 'ar'])('renders a missing optional expiry without crashing in %s', (locale) => {
    routeAccount('profile', ['packages'], locale);
    const state = createAccountFixtures();
    state.subscriptions = state.subscriptions.map((subscription) => ({
      ...subscription,
      expiresAt: undefined,
    }));
    render(
      <AccountContext.Provider value={{ state, dispatch: () => undefined, backend: true }}>
        <StudentPackages />
      </AccountContext.Provider>,
    );
    expect(
      screen.getAllByText(locale === 'ar' ? /لم تُضف بعد/ : /Not added yet/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(state.subscriptions.length);
  });
});
