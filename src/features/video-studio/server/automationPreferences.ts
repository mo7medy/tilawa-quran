import type { StudioCatalog } from '../contracts';
import { assert } from '../validation';

import type { AutomationCandidate } from './automationCandidates';

// Catalogue variants of one voice share usage; this is not an allowlist.
const READER_FAMILIES: Record<number, number> = { 2: 1, 12: 6, 168: 9, 173: 7 };
const readerFamily = (id: number): number => READER_FAMILIES[id] ?? id;
const readerUsage = (history: number[]): Map<number, number> => {
  const usage = new Map<number, number>();
  history.forEach((id) => usage.set(readerFamily(id), (usage.get(readerFamily(id)) ?? 0) + 1));
  return usage;
};

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
  history: number[] = [],
): StudioCatalog['reciters'] => {
  const eligible = catalog.reciters.filter((r) => !isExcludedAutomationReader(r.id, r.name));
  assert(eligible.length, 'AUDIO_UNAVAILABLE', 503);
  const usage = readerUsage(history);
  // A direct cycle visits every catalogue position, even when the catalogue size shares factors.
  const offset = seed % eligible.length;
  const rotated = Array.from(
    { length: eligible.length },
    (unused, i) => eligible[(offset + i) % eligible.length],
  );
  const distinct = rotated.filter(
    (r, i) => rotated.findIndex((other) => readerFamily(other.id) === readerFamily(r.id)) === i,
  );
  const ranked = [...distinct].sort(
    (a, b) => (usage.get(readerFamily(a.id)) ?? 0) - (usage.get(readerFamily(b.id)) ?? 0),
  );
  const selected = ranked.slice(0, 2);
  // Keep one rotating alternative so missing recordings do not trap the least-used voices.
  const alternate = distinct.find(
    (r) => !selected.some((other) => readerFamily(other.id) === readerFamily(r.id)),
  );
  return alternate ? [...selected, alternate] : selected;
};

// Balance only after source validation: a missing recording must not block an available voice.
export const diverseAutomationCandidates = (
  candidates: AutomationCandidate[],
  history: number[],
): AutomationCandidate[] => {
  if (!history.length) return candidates;
  const usage = readerUsage(history);
  const least = Math.min(...candidates.map((c) => usage.get(readerFamily(c.reciterId)) ?? 0));
  const balanced = candidates.filter((c) => (usage.get(readerFamily(c.reciterId)) ?? 0) === least);
  const previous = history[0];
  const alternatives = balanced.filter((c) => readerFamily(c.reciterId) !== readerFamily(previous));
  return alternatives.length ? alternatives : balanced;
};
