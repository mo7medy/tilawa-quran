/* eslint-disable import/order -- Register router mocks before importing account components. */
/* eslint-disable react-func/max-lines-per-function -- Cross-screen preview integration tests. */
import React from 'react';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { accountTestRoute, routeAccount } from './accountTestSetup';
import AccountPage from './AccountPage';
import AccountPreviewProvider from './AccountPreviewProvider';

afterEach(cleanup);
describe('Connected account screens', () => {
  it('saves a student profile locally and resets forms together with the examples', async () => {
    routeAccount('profile');
    render(
      <AccountPreviewProvider>
        <AccountPage area="profile" />
      </AccountPreviewProvider>,
    );
    const name = screen.getByLabelText('Full name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Taylor demo' } });
    fireEvent.submit(name.closest('form'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('updated'));
    expect(screen.getAllByText('Taylor demo').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset examples' }));
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Alex · Demo');
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('rejects future birthdays and does not collect passwords in security preview', () => {
    routeAccount('profile');
    render(
      <AccountPreviewProvider>
        <AccountPage area="profile" />
      </AccountPreviewProvider>,
    );
    const date = screen.getByLabelText('Date of birth') as HTMLInputElement;
    fireEvent.change(date, { target: { value: '2099-01-01' } });
    fireEvent.submit(date.closest('form'));
    expect(screen.getByRole('alert').textContent).toContain('not in the future');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('dialog').querySelector('input[type="password"]')).toBeNull();
  });
  it('accepts a request once and shows its new lesson from the student account', () => {
    routeAccount('teacher', ['requests', 'request-intro']);
    const app = (area: 'profile' | 'teacher') => (
      <AccountPreviewProvider>
        <AccountPage area={area} />
      </AccountPreviewProvider>
    );
    const view = render(app('teacher'));
    fireEvent.click(screen.getByRole('button', { name: 'Accept request' }));
    expect(screen.queryByRole('button', { name: 'Accept request' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Lesson details' }).getAttribute('href')).toContain(
      'lesson-request-intro',
    );
    routeAccount('profile', ['lessons']);
    view.rerender(app('profile'));
    expect(
      screen
        .getAllByRole('link', { name: 'Lesson details' })
        .map((link) => link.getAttribute('href')),
    ).toContain('/lessons/lesson-request-intro?preview=student');
  });
  it('keeps a conversation when switching preview roles and prevents blank messages', () => {
    routeAccount('profile', ['messages']);
    const app = () => (
      <AccountPreviewProvider>
        <AccountPage area="profile" />
      </AccountPreviewProvider>
    );
    const view = render(app());
    const submit = screen.getByRole('button', { name: 'Send in preview' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Can we practise reading?' },
    });
    fireEvent.submit(submit.closest('form'));
    accountTestRoute.query.preview = 'teacher';
    view.rerender(app());
    expect(within(screen.getByRole('log')).getByText('Can we practise reading?')).toBeDefined();
  });
  it('blocks teaching tools for a pending profile and preserves editable profile access', () => {
    routeAccount('teacher');
    const app = () => (
      <AccountPreviewProvider>
        <AccountPage area="teacher" />
      </AccountPreviewProvider>
    );
    const view = render(app());
    fireEvent.change(screen.getByLabelText('Preview an approval state'), {
      target: { value: 'pending' },
    });
    routeAccount('teacher', ['requests']);
    view.rerender(app());
    expect(
      screen.getByText('Teaching tools become available after your teacher profile is approved.'),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Accept request' })).toBeNull();
  });
});
