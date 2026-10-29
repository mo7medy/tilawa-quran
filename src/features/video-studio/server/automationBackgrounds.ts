/* eslint-disable import/prefer-default-export -- One server-only background selection boundary. */
import { StudioCatalog } from '../contracts';
import { assert } from '../validation';

const randomIndex = (size: number): number => {
  const range = 0x100000000;
  const ceiling = range - (range % size);
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= ceiling);
  return bytes[0] % size;
};

/**
 * Draw once per plan; the persisted project keeps preview, retries and export identical.
 * @returns {string[]} Opening image and up to four distinct images from its collection.
 */
export const randomAutomationBackgrounds = (
  catalog: StudioCatalog,
  previousFirst?: string | string[],
  draw: (size: number) => number = randomIndex,
): string[] => {
  const images = catalog.backgrounds.filter(
    (image) => image.type === 'image' && image.orientation === 'portrait',
  );
  assert(images.length > 0, 'CONTENT_UNAVAILABLE', 503);
  const excluded = Array.isArray(previousFirst) ? previousFirst : [previousFirst];
  const alternatives = images.filter((image) => !excluded.includes(image.id));
  const pool = alternatives.length ? alternatives : images;
  const first = pool[draw(pool.length)];
  const remaining = images.filter(
    (image) => image.id !== first.id && image.collection === first.collection,
  );
  const selected = [first.id];
  while (selected.length < 5 && remaining.length) {
    const [image] = remaining.splice(draw(remaining.length), 1);
    selected.push(image.id);
  }
  return selected;
};
