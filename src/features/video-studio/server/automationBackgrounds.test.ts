// @vitest-environment node
/* eslint-disable react-func/max-lines-per-function -- Group the random-selection acceptance cases in one suite. */
import { describe, expect, it } from 'vitest';

import { StudioCatalog } from '../contracts';

import { randomAutomationBackgrounds } from './automationBackgrounds';

const image = (number: number): StudioCatalog['backgrounds'][number] => ({
  id: `r2-portrait_${number}`,
  type: 'image',
  orientation: 'portrait',
  collection: 'nature',
  url: `https://studio.example/${number}.jpg`,
});
const catalog = (backgrounds: StudioCatalog['backgrounds']): StudioCatalog => ({
  enabled: true,
  chapters: [],
  reciters: [],
  translations: [],
  backgrounds,
});

describe('random automatic video backgrounds', () => {
  it('can start with any portrait in a library larger than thirty', () => {
    const images = Array.from({ length: 75 }, (unused, index) => image(index + 1));
    const reachable = images.map((unused, index) => {
      let first = true;
      return randomAutomationBackgrounds(catalog(images), undefined, () => {
        if (first) {
          first = false;
          return index;
        }
        return 0;
      })[0];
    });
    expect(reachable).toEqual(images.map((item) => item.id));
  });
  it('prevents repeating the previous opening even if selection always prefers the first option', () => {
    const source = catalog([image(1), image(2), image(3)]);
    const first = randomAutomationBackgrounds(source, undefined, () => 0);
    const next = randomAutomationBackgrounds(source, first[0], () => 0);
    expect(first[0]).toBe('r2-portrait_1');
    expect(next[0]).toBe('r2-portrait_2');
  });
  it('excludes every target previous opening when sharing a video', () => {
    const result = randomAutomationBackgrounds(
      catalog([image(1), image(2), image(3)]),
      ['r2-portrait_1', 'r2-portrait_2'],
      () => 0,
    );
    expect(result[0]).toBe('r2-portrait_3');
  });
  it('draws a unique shuffled sequence of at most five without changing the catalogue', () => {
    const source = catalog(Array.from({ length: 8 }, (unused, index) => image(index + 1)));
    const original = JSON.stringify(source);
    const selected = randomAutomationBackgrounds(source, undefined, (size) => size - 1);
    expect(selected).toEqual([
      'r2-portrait_8',
      'r2-portrait_7',
      'r2-portrait_6',
      'r2-portrait_5',
      'r2-portrait_4',
    ]);
    expect(new Set(selected).size).toBe(selected.length);
    expect(JSON.stringify(source)).toBe(original);
  });
  it('keeps one collection and excludes landscape images and video backgrounds', () => {
    const source = catalog([
      image(1),
      { ...image(2), collection: 'sakina' },
      { ...image(3), orientation: 'landscape' },
      { id: 'sea', url: 'https://studio.example/sea.mp4', type: 'video' },
      image(4),
    ]);
    expect(randomAutomationBackgrounds(source, undefined, () => 0)).toEqual([
      'r2-portrait_1',
      'r2-portrait_4',
    ]);
  });
  it('still works when the library has only the previously used image', () => {
    expect(randomAutomationBackgrounds(catalog([image(1)]), 'r2-portrait_1')).toEqual([
      'r2-portrait_1',
    ]);
  });
  it('rejects a catalogue without any eligible image', () => {
    expect(() => randomAutomationBackgrounds(catalog([]))).toThrow('CONTENT_UNAVAILABLE');
  });
});
