// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { capability, validCapability } from './crypto';

describe('distributed guest cookies', () => {
  it('accepts a fresh day-long guest cookie across a small Worker clock difference', async () => {
    vi.useFakeTimers();
    try {
      const issued = Date.parse('2026-10-24T12:00:00Z');
      vi.setSystemTime(issued);
      const token = await capability('secret', 'guest:test', issued + 86400000);
      vi.setSystemTime(issued - 1000);
      expect(await validCapability('secret', 'guest:test', token)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
describe('file capabilities', () => {
  it('binds a short-lived signature to a single file and attempt', async () => {
    const secret = 'test-secret-with-at-least-32-characters';
    const token = await capability(secret, 'output:one:1', Date.now() + 60000);
    expect(await validCapability(secret, 'output:one:1', token)).toBe(true);
    expect(await validCapability(secret, 'output:one:2', token)).toBe(false);
    expect(await validCapability(secret, 'output:two:1', token)).toBe(false);
    expect(await validCapability('other-secret', 'output:one:1', token)).toBe(false);
    expect(await validCapability(secret, 'output:one:1', `${token}a`)).toBe(false);
  });
  it('rejects expired and arbitrarily long-lived capabilities', async () => {
    expect(
      await validCapability(
        'secret',
        'file:1',
        await capability('secret', 'file:1', Date.now() - 1),
      ),
    ).toBe(false);
    expect(
      await validCapability(
        'secret',
        'file:1',
        await capability('secret', 'file:1', Date.now() + 2 * 86400000),
      ),
    ).toBe(false);
  });
});
