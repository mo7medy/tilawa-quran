import type { StudioCatalog } from '../contracts';
import { assert } from '../validation';

// Editorial preferences, not a live social-platform ranking. IDs come from Tilawa's catalogue.
const PREFERRED_READERS = [9, 1, 2, 7, 174, 6, 12, 19, 13, 159, 4, 5, 158, 173];

// Whole-ayah anchors. Source timings determine whether they can fit a 30–70 second video.
// 53:39–41 is the user's reference: https://www.tiktok.com/@abo.3aid/video/7671728791101689096
export const AUTOMATION_FEATURED_PASSAGES = [
  [53, 39, 41],
  [59, 19, 21],
  [2, 152, 153],
  [2, 155, 157],
  [2, 255, 255],
  [2, 285, 286],
  [3, 8, 9],
  [3, 193, 194],
  [9, 128, 129],
  [12, 86, 87],
  [12, 90, 92],
  [13, 28, 29],
  [14, 40, 41],
  [16, 127, 128],
  [17, 78, 82],
  [20, 25, 35],
  [21, 87, 88],
  [23, 115, 118],
  [24, 35, 35],
  [25, 63, 65],
  [33, 56, 56],
  [35, 29, 30],
  [36, 58, 59],
  [39, 53, 54],
  [40, 60, 60],
  [41, 30, 32],
  [50, 19, 22],
  [51, 50, 51],
  [55, 26, 30],
  [57, 22, 23],
  [59, 21, 24],
  [65, 2, 3],
  [67, 1, 4],
  [73, 1, 9],
  [82, 6, 8],
  [87, 14, 19],
  [89, 27, 30],
  [93, 1, 11],
  [94, 1, 8],
  [97, 1, 5],
] as const;

export const isExcludedAutomationReader = (id: number, name = ''): boolean =>
  id === 3 ||
  /sudais|sudeys|السديس/i.test(name.normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, ''));

export const automationReaders = (
  catalog: StudioCatalog,
  seed: number,
): StudioCatalog['reciters'] => {
  const preferred = PREFERRED_READERS.map((id) => catalog.reciters.find((r) => r.id === id))
    .filter((r): r is StudioCatalog['reciters'][number] => !!r)
    .filter((r) => !isExcludedAutomationReader(r.id, r.name));
  assert(preferred.length, 'AUDIO_UNAVAILABLE', 503);
  const minshawi = preferred.find((r) => r.id === 9);
  const rotating = preferred.filter((r) => r.id !== minshawi?.id);
  // eslint-disable-next-line no-bitwise -- Preserve deterministic retry rotation without favoring catalogue order.
  const offset = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
  return [
    ...(minshawi ? [minshawi] : []),
    ...Array.from(
      { length: Math.min(minshawi ? 2 : 3, rotating.length) },
      (unused, i) => rotating[(offset + i) % rotating.length],
    ),
  ];
};
