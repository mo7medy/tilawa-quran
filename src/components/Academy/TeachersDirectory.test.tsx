import React from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTeachersDirectoryState } from '../../tilawa/teachers';
import type { AcademyTeacherProfile } from '../../tilawa/teachers';

import TeachersDirectory from './TeachersDirectory';

vi.mock('../../tilawa/teachers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tilawa/teachers')>()),
  getTeachersDirectoryState: vi.fn(),
}));
vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
vi.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));

const teacher = (
  id: string,
  specialty: AcademyTeacherProfile['specialties'][number],
  gender: AcademyTeacherProfile['gender'],
  price: number | null,
): AcademyTeacherProfile => ({
  id,
  slug: id,
  displayName: id,
  countryLabel: '',
  gender,
  specialties: [specialty],
  teachingLanguages: ['en'],
  sessionPriceCents: price,
  sessionDurationMinutes: 30,
  rating: 0,
  reviewCount: 0,
  availableToday: false,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Teacher directory controls', () => {
  it('combines subject, gender, price and case-insensitive name filters', () => {
    vi.mocked(getTeachersDirectoryState).mockReturnValue({
      status: 'ready',
      teachers: [
        teacher('Tutor A', 'tajweed', 'male', 1500),
        teacher('Tutor B', 'arabic_for_non_arabic_speakers', 'female', 1000),
        teacher('Tutor C', 'memorization', 'male', null),
      ],
    });
    render(<TeachersDirectory isStandalonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'teachers.filters.quran' }));
    expect(screen.queryByRole('heading', { name: 'Tutor B' })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tutor a' } });
    expect(screen.getByRole('heading', { name: 'Tutor A' })).toBeDefined();
    fireEvent.change(screen.getByRole('combobox', { name: 'marketplace.gender-label' }), {
      target: { value: 'female' },
    });
    expect(screen.queryByRole('heading', { name: 'Tutor A' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('teachers.no-results');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'marketplace.gender-label' }), {
      target: { value: 'all' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'marketplace.price-label' }), {
      target: { value: '2000' },
    });
    expect(screen.getByRole('heading', { name: 'Tutor A' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Tutor C' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'marketplace.price-label' }), {
      target: { value: '1000' },
    });
    expect(screen.getByRole('status').textContent).toContain('teachers.no-results');
  });

  it('keeps an unconfigured directory empty after filter changes', () => {
    vi.mocked(getTeachersDirectoryState).mockReturnValue({ status: 'empty', teachers: [] });
    const { container } = render(<TeachersDirectory isStandalonePage />);
    fireEvent.click(screen.getByRole('button', { name: 'teachers.filters.quran' }));
    expect(screen.getByRole('status').textContent).toContain('teachers.empty-title');
    expect(container.querySelector('ul')).toBeNull();
  });
});
