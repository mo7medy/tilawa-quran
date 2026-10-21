import { describe, expect, it } from 'vitest';

import { createAccountFixtures } from './fixtures';
import { accountInitials } from './navigation';
import { accountTimeZones, countryOptions, validStudentProfile } from './profile';

describe('Student profile fields', () => {
  const minimal = {
    ...createAccountFixtures().student,
    name: 'Amina Reader',
    country: 'United Kingdom',
    birthDate: '',
    goal: '',
    schedule: '',
  };
  it('accepts the required fields without optional preferences', () =>
    expect(validStudentProfile(minimal)).toBe(true));
  it.each([
    { name: '' },
    { country: '' },
    { birthDate: '2099-01-01' },
    { birthDate: '2024-02-30' },
    { zone: 'Missing/Zone' },
  ])('rejects invalid values %j', (change) =>
    expect(validStudentProfile({ ...minimal, ...change })).toBe(false),
  );
  it('retains legacy country values and saved time zones', () => {
    expect(countryOptions('ar', 'Legacy country')).toContainEqual({
      value: 'Legacy country',
      label: 'Legacy country',
    });
    expect(accountTimeZones('Pacific/Chatham', 'Africa/Cairo')).toContain('Pacific/Chatham');
    expect(accountInitials('Amina Reader')).toBe('AR');
    expect(accountInitials('')).toBe('');
  });
});
