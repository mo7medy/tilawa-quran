/* eslint-disable import/order -- Register router mocks before importing account components. */
/* eslint-disable react-func/max-lines-per-function -- Route and rendering matrix. */
import React from 'react';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { accountTestRoute, routeAccount } from './accountTestSetup';
import AccountPage from './AccountPage';
import AccountPreviewProvider from './AccountPreviewProvider';

afterEach(cleanup);
const profileSections = [
  [],
  ['learning'],
  ['lessons'],
  ['teachers'],
  ['packages'],
  ['teacher'],
  ['messages'],
];
const teacherSections = [
  [],
  ['requests'],
  ['requests', 'request-intro'],
  ['lessons'],
  ['availability'],
  ['students'],
  ['students', 'preview-student'],
  ['reviews'],
  ['coupons'],
  ['earnings'],
  ['withdrawals'],
];
describe.each(['en', 'ar'])('Account pages in %s', (locale) => {
  (['profile', 'teacher', 'lesson'] as const).forEach((area) => {
    const sections = {
      teacher: teacherSections,
      profile: profileSections,
      lesson: [['lesson-next']],
    }[area];
    it.each(sections.map((parts) => [parts.join('/') || 'index', parts] as const))(
      `renders ${area}/%s`,
      (label, parts) => {
        routeAccount(area, [...parts], locale);
        render(
          <AccountPreviewProvider>
            <AccountPage area={area} />
          </AccountPreviewProvider>,
        );
        expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe('');
        expect(document.querySelector('form input[type="password"]')).toBeNull();
        expect(document.body.textContent).not.toContain('undefined');
        expect(document.body.textContent).not.toContain('NaN');
        expect(
          document.querySelector('[aria-label="Account sections"], [aria-label="أقسام الحساب"]'),
        ).not.toBeNull();
      },
    );
  });
});
describe('Preview data states and finance', () => {
  it.each(['loading', 'error', 'empty'])('supports the %s state without network data', (view) => {
    routeAccount('profile', ['lessons']);
    accountTestRoute.query.view = view;
    render(
      <AccountPreviewProvider>
        <AccountPage area="profile" />
      </AccountPreviewProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    if (view === 'empty') expect(screen.getByText(/No lessons here yet/)).toBeDefined();
    else expect(screen.getByRole('link', { name: 'Return to preview' })).toBeDefined();
  });
  it('handles missing records and invalid section names', () => {
    routeAccount('lesson', ['missing']);
    render(
      <AccountPreviewProvider>
        <AccountPage area="lesson" />
      </AccountPreviewProvider>,
    );
    expect(screen.getByText('This record is not available in the preview.')).toBeDefined();
  });
  it('creates a withdrawal in preview and prevents an amount above the balance', async () => {
    routeAccount('teacher', ['withdrawals']);
    render(
      <AccountPreviewProvider>
        <AccountPage area="teacher" />
      </AccountPreviewProvider>,
    );
    const amount = screen.getByLabelText('Amount in USD');
    fireEvent.change(amount, { target: { value: '200' } });
    fireEvent.submit(amount.closest('form'));
    expect(screen.getByRole('alert')).toBeDefined();
    fireEvent.change(amount, { target: { value: '50' } });
    fireEvent.submit(amount.closest('form'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No transfer'));
    expect(screen.getByText('withdrawal-1 · $50.00')).toBeDefined();
  });
  it('supports coupon creation, validation and deactivation', async () => {
    routeAccount('teacher', ['coupons']);
    render(
      <AccountPreviewProvider>
        <AccountPage area="teacher" />
      </AccountPreviewProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create sample coupon' }));
    const code = screen.getByLabelText('Coupon code');
    fireEvent.change(code, { target: { value: 'WELCOME' } });
    fireEvent.submit(code.closest('form'));
    expect(screen.getByRole('alert').textContent).toContain('already exists');
    fireEvent.change(code, { target: { value: 'ARABIC10' } });
    fireEvent.submit(code.closest('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('ARABIC10')).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[1]);
    expect(screen.getByRole('button', { name: 'Activate' })).toBeDefined();
  });
});
