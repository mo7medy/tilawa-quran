/* eslint-disable react-func/max-lines-per-function -- Connected form state regression scenarios. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountContext } from './AccountContext';
import { accountTestRoute, routeAccount } from './accountTestSetup';
import StudentProfile from './StudentProfile';

import { createAccountFixtures } from '@/tilawa/account/fixtures';
import type { PreviewAction } from '@/tilawa/account/types';

afterEach(cleanup);

describe('Student profile read and edit modes', () => {
  it('keeps an unsaved draft during refresh and cancels to the latest saved values', () => {
    routeAccount('profile');
    const original = createAccountFixtures();
    const app = (name: string) => (
      <AccountContext.Provider
        value={{
          state: { ...original, student: { ...original.student, name } },
          dispatch: vi.fn(),
        }}
      >
        <StudentProfile />
      </AccountContext.Provider>
    );
    const view = render(app('Saved name'));
    expect(screen.queryByLabelText('Full name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Unsaved draft' } });
    view.rerender(app('Background update'));
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Unsaved draft');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('heading', { name: 'Background update' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe(
      'Background update',
    );
  });
  it('saves only the required personal fields once and leaves empty optional fields empty', async () => {
    routeAccount('profile');
    const state = createAccountFixtures();
    state.student = {
      ...state.student,
      name: 'New learner',
      country: 'United Kingdom',
      birthDate: '',
      goal: '',
      schedule: '',
    };
    let finish: (value: boolean) => void = () => {};
    const dispatch = vi.fn(
      (action: PreviewAction) =>
        new Promise<boolean>((resolve) => {
          expect(action.type).toBe('student');
          finish = resolve;
        }),
    );
    render(
      <AccountContext.Provider value={{ state, dispatch }}>
        <StudentProfile />
      </AccountContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    const form = screen.getByLabelText('Full name').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: 'student',
      value: { birthDate: '', goal: '', schedule: '' },
    });
    await act(async () => finish(true));
    await waitFor(() => expect(screen.queryByLabelText('Full name')).toBeNull());
  });
  it('does not silently replace the saved time zone with the device time zone', () => {
    routeAccount('profile');
    accountTestRoute.locale = 'en';
    const state = createAccountFixtures();
    state.student.zone = 'Pacific/Chatham';
    render(
      <AccountContext.Provider value={{ state, dispatch: vi.fn() }}>
        <StudentProfile />
      </AccountContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect((screen.getByLabelText('Time zone') as HTMLSelectElement).value).toBe('Pacific/Chatham');
  });
});
