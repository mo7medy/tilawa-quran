// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { StudioCatalog } from '../contracts';

import { automationReaders, isExcludedAutomationReader } from './automationPreferences';

const catalog = {
  reciters: [
    { id: 3, name: 'Abdur-Rahman as-Sudais' },
    { id: 9, name: 'Muhammad Siddiq al-Minshawi' },
    { id: 1, name: 'AbdulBaset AbdulSamad [Mujawwad]' },
    { id: 7, name: 'Mishari Rashid al-Afasy' },
    { id: 174, name: 'Yasser ad-Dussary' },
    { id: 168, name: 'Muhammad Siddiq al-Minshawi (with kids)' },
    { id: 999, name: 'Uncurated reader' },
  ],
} as StudioCatalog;

describe('automatic reciter preferences', () => {
  it('always offers adult Minshawi and rotates other approved voices without offering Sudais', () => {
    const rotated = new Set<number>();
    Array.from({ length: 60 }, (unused, seed) => {
      const readers = automationReaders(catalog, seed);
      expect(readers).toHaveLength(3);
      expect(readers[0].id).toBe(9);
      readers.forEach((r) => {
        expect([9, 1, 7, 174]).toContain(r.id);
        rotated.add(r.id);
      });
      return null;
    });
    expect(rotated.size).toBe(4);
  });
  it('blocks catalogue aliases as well as the known Sudais identifier', () => {
    expect(isExcludedAutomationReader(3)).toBe(true);
    expect(isExcludedAutomationReader(900, 'عبد الرحمن السُّدَيْس')).toBe(true);
    expect(isExcludedAutomationReader(901, 'Abdul Rahman Al Sudais')).toBe(true);
    expect(isExcludedAutomationReader(9, 'محمد صديق المنشاوي')).toBe(false);
  });
  it('fails clearly when no approved recording voice is available', () => {
    expect(() =>
      automationReaders({ reciters: [catalog.reciters[0]] } as StudioCatalog, 1),
    ).toThrow('AUDIO_UNAVAILABLE');
  });
});
