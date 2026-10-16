import React from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SAMPLE_TEACHERS from '../../tilawa/teacherSamples';

import TeacherBookingPreview from './TeacherBookingPreview';

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));

afterEach(cleanup);

describe('Booking design preview', () => {
  it('requires a slot and clears the review and slot after the date changes', () => {
    const { container } = render(
      <TeacherBookingPreview teacher={SAMPLE_TEACHERS[0]} referenceDate="2026-10-14" />,
    );
    const submit = screen.getByRole('button', {
      name: 'profile.review-request',
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /9:00/ }));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(screen.getByRole('status').textContent).toContain('profile.not-submitted');
    fireEvent.change(container.querySelector('input[type="date"]'), {
      target: { value: '2026-10-15' },
    });
    expect(submit.disabled).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('changes displayed timezone while preserving the selected UTC slot', () => {
    render(<TeacherBookingPreview teacher={SAMPLE_TEACHERS[0]} referenceDate="2026-10-14" />);
    fireEvent.click(screen.getByRole('button', { name: /9:00/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'America/New_York' } });
    expect(screen.getByRole('button', { name: /5:00/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'profile.review-request' }));
    expect(screen.getByRole('status').textContent).toContain('America/New_York');
  });
});
