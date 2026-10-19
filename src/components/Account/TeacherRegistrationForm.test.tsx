/* eslint-disable import/order -- Register shared router and localization mocks first. */
/* eslint-disable react-func/max-lines-per-function -- Keep multi-stage user journeys together. */
/* eslint-disable max-lines -- Cover validation, preservation and all three pricing modes together. */
import React from 'react';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routeAccount } from './accountTestSetup';
import { AccountContext } from './AccountContext';
import TeacherRegistrationForm from './TeacherRegistrationForm';

import { createAccountFixtures } from '@/tilawa/account/fixtures';
import type { TeacherAccount } from '@/tilawa/account/types';

afterEach(cleanup);
const mount = (locale = 'en', backend = false) => {
  routeAccount('profile', ['teacher'], locale);
  const state = createAccountFixtures();
  state.teacher.phone = '+20 100 123 4567';
  state.teacher.publicProfile.photoUrl = '';
  state.teacher.publicProfile.introductionVideoUrl = '';
  state.teacher.publicProfile.qualifications = [
    { en: '[TEST] qualification', ar: '[TEST] qualification' },
  ];
  const dispatch = vi.fn(async (action: unknown) => action !== null);
  render(
    <AccountContext.Provider value={{ state, dispatch, backend }}>
      <TeacherRegistrationForm />
    </AccountContext.Provider>,
  );
  return { state, dispatch, form: screen.getByRole('form') as HTMLFormElement };
};
const continueRegistration = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Continue to plans and pricing' }));
};

describe('Teacher registration stages', () => {
  it('validates the first stage and focuses the invalid field', () => {
    const { dispatch } = mount();
    const phone = screen.getByLabelText('Contact phone');
    fireEvent.change(phone, { target: { value: '123' } });
    continueRegistration();
    expect(screen.getByText('Step 1 of 2')).toBeDefined();
    expect(document.activeElement).toBe(phone);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.change(phone, { target: { value: '+20 100 123 4567' } });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '   ' } });
    continueRegistration();
    expect(document.activeElement).toBe(screen.getByLabelText('Full name'));
  });
  it('requires a specialty without saving when advancing', () => {
    const { dispatch, form } = mount();
    form.querySelectorAll<HTMLInputElement>('input[name="specialty"]').forEach((input) => {
      if (input.checked) fireEvent.click(input);
    });
    continueRegistration();
    expect(screen.getByText('Step 1 of 2')).toBeDefined();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tajweed and recitation' }));
    continueRegistration();
    expect(screen.getByText('Step 2 of 2')).toBeDefined();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('preserves both stages and saves without optional media', async () => {
    const { dispatch } = mount();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Teacher Mariam' } });
    continueRegistration();
    fireEvent.change(screen.getByLabelText('Price per lesson (USD)'), {
      target: { value: '19.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to information' }));
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Teacher Mariam');
    continueRegistration();
    expect((screen.getByLabelText('Price per lesson (USD)') as HTMLInputElement).value).toBe(
      '19.50',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save in preview' }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledOnce());
    const action = dispatch.mock.calls[0][0] as { value: TeacherAccount };
    expect(action.value.publicProfile.displayName).toBe('Teacher Mariam');
    expect(action.value.publicProfile.sessionPriceCents).toBe(1950);
    expect(action.value.publicProfile.photoUrl).toBe('');
    expect(action.value.publicProfile.introductionVideoUrl).toBe('');
    expect(screen.getByRole('status')).toBeDefined();
  });
  it.each(['perLesson', 'monthly', 'both'])('validates enabled prices for %s', async (mode) => {
    const { dispatch } = mount('en', true);
    continueRegistration();
    fireEvent.change(screen.getByLabelText('Pricing options'), { target: { value: mode } });
    const lessonPrice = screen.getByLabelText('Price per lesson (USD)') as HTMLInputElement;
    const monthlyPrice = screen.getByLabelText('Monthly price (USD)') as HTMLInputElement;
    expect(lessonPrice.disabled).toBe(mode === 'monthly');
    expect(monthlyPrice.disabled).toBe(mode === 'perLesson');
    const activePrice = mode === 'monthly' ? monthlyPrice : lessonPrice;
    fireEvent.change(activePrice, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.change(activePrice, { target: { value: '25.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledOnce());
    const action = dispatch.mock.calls[0][0] as { value: TeacherAccount };
    expect(action.value.email).toBe('teacher@example.test');
    expect(action.value.monthlyLessons).toBe(8);
    expect(action.value.pricing).toBe(mode);
  });
  it('retains unsaved values when a save fails', async () => {
    const { dispatch } = mount();
    dispatch.mockResolvedValueOnce(false);
    continueRegistration();
    fireEvent.change(screen.getByLabelText('Price per lesson (USD)'), { target: { value: '22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save in preview' }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledOnce());
    expect(screen.queryByRole('status')).toBeNull();
    expect((screen.getByLabelText('Price per lesson (USD)') as HTMLInputElement).value).toBe('22');
  });
  it('discards unsaved changes and returns to stage one', () => {
    const { state } = mount();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Unsaved teacher' } });
    continueRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByText('Step 1 of 2')).toBeDefined();
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe(
      state.teacher.publicProfile.displayName,
    );
  });
  it('localizes the stages, optional photo and USD pricing in Arabic', () => {
    mount('ar');
    expect(screen.getByText('الخطوة 1 من 2')).toBeDefined();
    expect(document.querySelector('input[type="file"]')?.closest('label')?.textContent).toContain(
      'اختياري',
    );
    fireEvent.click(screen.getByRole('button', { name: 'التالي: الخطط والتسعير' }));
    const steps = screen.getByRole('navigation', { name: 'مراحل تسجيل المعلم' });
    expect(
      within(steps).getByRole('button', { name: 'الخطط والتسعير' }).getAttribute('aria-current'),
    ).toBe('step');
    expect(screen.getByText('جميع أسعار المعلم بالدولار الأمريكي (USD).')).toBeDefined();
  });
});
