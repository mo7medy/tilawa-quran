// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { StudioCatalog } from '../contracts';

import type { AutomationCandidate } from './automationCandidates';
import {
  automationReaders,
  diverseAutomationCandidates,
  isExcludedAutomationReader,
} from './automationPreferences';

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

// eslint-disable-next-line react-func/max-lines-per-function -- Group the reader rotation contract scenarios in one Vitest suite.
describe('automatic reciter preferences', () => {
  it('offers every catalogue reader except Sudais without a reserved Minshawi position', () => {
    const rotated = new Set<number>();
    Array.from({ length: 60 }, (unused, seed) => {
      const readers = automationReaders(catalog, seed);
      expect(readers).toHaveLength(3);
      readers.forEach((r) => {
        expect(r.id).not.toBe(3);
        rotated.add(r.id);
      });
      return null;
    });
    expect(Array.from(rotated).sort((a, b) => a - b)).toEqual([1, 7, 9, 168, 174, 999]);
    expect(
      automationReaders(
        { reciters: [{ id: 1001, name: 'New catalogue reader' }] } as StudioCatalog,
        0,
      )[0].id,
    ).toBe(1001);
  });
  it('balances repeated model first-choice bias across all available voices', () => {
    const source = { ...catalog, reciters: catalog.reciters.filter((r) => r.id !== 168) };
    const history: number[] = [];
    const counts = new Map<number, number>();
    Array.from({ length: 60 }, (unused, seed) => {
      const candidates = automationReaders(source, seed, history).map((r) => ({
        id: String(r.id),
        reciterId: r.id,
        reciter: r.name,
        chapterId: 53,
        chapter: 'An-Najm',
        from: 39,
        to: 44,
        durationMs: 30000,
      }));
      const chosen = diverseAutomationCandidates(candidates, history)[0].reciterId;
      expect(chosen).not.toBe(history[0]);
      history.unshift(chosen);
      counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
      return null;
    });
    expect(Array.from(counts.keys()).sort((a, b) => a - b)).toEqual([1, 7, 9, 174, 999]);
    expect(
      Math.max(...Array.from(counts.values())) - Math.min(...Array.from(counts.values())),
    ).toBeLessThanOrEqual(1);
  });
  it('counts variants of the same reciter together and prefers less-used available voices', () => {
    const candidates = [168, 173, 6].map((id) => ({ reciterId: id } as AutomationCandidate));
    expect(diverseAutomationCandidates(candidates, [9, 9, 7]).map((c) => c.reciterId)).toEqual([6]);
    expect(diverseAutomationCandidates(candidates, [9, 7, 6]).map((c) => c.reciterId)).toEqual([
      173, 6,
    ]);
    expect(diverseAutomationCandidates([candidates[0]], [9])).toEqual([candidates[0]]);
  });
  it('blocks catalogue aliases as well as the known Sudais identifier', () => {
    expect(isExcludedAutomationReader(3)).toBe(true);
    expect(isExcludedAutomationReader(900, 'عبد الرحمن السُّدَيْس')).toBe(true);
    expect(isExcludedAutomationReader(901, 'Abdul Rahman Al Sudais')).toBe(true);
    expect(isExcludedAutomationReader(9, 'محمد صديق المنشاوي')).toBe(false);
  });
  it('fails clearly when the catalogue contains only the excluded reciter', () => {
    expect(() =>
      automationReaders({ reciters: [catalog.reciters[0]] } as StudioCatalog, 1),
    ).toThrow('AUDIO_UNAVAILABLE');
  });
});
