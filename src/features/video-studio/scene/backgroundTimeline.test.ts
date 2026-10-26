/* eslint-disable react-func/max-lines-per-function -- Boundary frames are checked together to establish temporal continuity. */
import { describe, expect, it } from 'vitest';

import { backgroundLayers } from './backgroundTimeline';

describe('deterministic background transitions', () => {
  it('keeps an opaque outgoing image throughout the 1.2 second crossfade', () => {
    const start = backgroundLayers(360, 30, 65000, 4, true);
    const midpoint = backgroundLayers(378, 30, 65000, 4, true);
    const end = backgroundLayers(396, 30, 65000, 4, true);
    expect(start.map((layer) => [layer.index, layer.opacity])).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(midpoint.map((layer) => [layer.index, layer.opacity])).toEqual([
      [0, 1],
      [1, 0.5],
    ]);
    expect(end).toHaveLength(1);
    expect(end[0]).toMatchObject({ index: 1, opacity: 1 });
  });
  it('preserves the outgoing camera position at the segment boundary and on seek', () => {
    const before = backgroundLayers(359, 30, 65000, 4, true)[0];
    const after = backgroundLayers(360, 30, 65000, 4, true)[0];
    expect(Math.abs(before.scale - after.scale)).toBeLessThan(0.001);
    expect(backgroundLayers(378, 30, 65000, 4, true)).toEqual(
      backgroundLayers(378, 30, 65000, 4, true),
    );
    expect(backgroundLayers(0, 30, 65000, 4, true)).toHaveLength(1);
  });
  it('allows still images and prevents single-image jumps at artificial shot boundaries', () => {
    expect(backgroundLayers(100, 30, 65000, 1, false)).toEqual([
      { index: 0, opacity: 1, scale: 1, x: 0 },
    ]);
    expect(backgroundLayers(361, 30, 65000, 1, true)[0].scale).toBeGreaterThan(
      backgroundLayers(359, 30, 65000, 1, true)[0].scale,
    );
    expect(backgroundLayers(0, 30, 65000, 0, true)).toEqual([]);
  });
  it('loops to the first image without a black frame', () => {
    expect(
      backgroundLayers(1440, 30, 65000, 4, true).map((layer) => [layer.index, layer.opacity]),
    ).toEqual([
      [3, 1],
      [0, 0],
    ]);
  });
});
