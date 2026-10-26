/* eslint-disable @typescript-eslint/naming-convention -- Provider decision fields. */
/* eslint-disable react-func/max-lines-per-function -- Validate all selected catalogue identifiers at one boundary. */
/* eslint-disable import/prefer-default-export -- Named domain validator. */
/* eslint-disable prefer-regex-literals -- Unicode property escapes use a constructor because the TypeScript target is ES5. */
import { AutomationPlan } from '../automation';
import { defaultSpec, StudioCatalog } from '../contracts';
import { assert, record, validateSpec } from '../validation';

import { AutomationCandidate } from './automationCandidates';

interface Decision extends Record<string, unknown> {
  candidateId: string;
  backgroundId: string;
  translationId: number;
  font: string;
  template: string;
  caption: string;
  hashtags: string[];
  skipOptional: boolean;
}
export const validateAutomationDecision = (
  input: unknown,
  candidates: AutomationCandidate[],
  catalog: StudioCatalog,
  optional: boolean,
): AutomationPlan | null => {
  const d = record(input) as Decision;
  assert(typeof d.skipOptional === 'boolean', 'AUTOMATION_INVALID_DECISION');
  if (optional && d.skipOptional) return null;
  assert(!d.skipOptional, 'AUTOMATION_INVALID_DECISION');
  const candidate = candidates.find((c) => c.id === d.candidateId);
  assert(
    candidate && candidate.durationMs >= 30000 && candidate.durationMs <= 70000,
    'AUTOMATION_INVALID_DECISION',
  );
  assert(
    catalog.backgrounds.some((b) => b.id === d.backgroundId && b.type === 'image'),
    'AUTOMATION_INVALID_DECISION',
  );
  assert(
    catalog.translations.some((t) => t.id === d.translationId),
    'AUTOMATION_INVALID_DECISION',
  );
  assert(
    typeof d.caption === 'string' && d.caption.length > 0 && d.caption.length <= 220,
    'AUTOMATION_INVALID_DECISION',
  );
  assert(
    Array.isArray(d.hashtags) &&
      d.hashtags.length <= 5 &&
      d.hashtags.every(
        (h) => typeof h === 'string' && new RegExp('^#[\\p{L}\\p{N}_]{1,40}$', 'u').test(h),
      ),
    'AUTOMATION_INVALID_DECISION',
  );
  const spec = validateSpec({
    ...defaultSpec,
    title: `${candidate.chapter} ${candidate.from}–${candidate.to}`,
    chapterId: candidate.chapterId,
    from: candidate.from,
    to: candidate.to,
    reciterId: candidate.reciterId,
    translationId: d.translationId,
    font: d.font,
    template: d.template,
    fontSize: 54,
    translationSize: 28,
    background: { type: 'library', value: d.backgroundId, opacity: 0.65, position: 50 },
  });
  return {
    spec,
    caption: d.caption,
    hashtags: d.hashtags,
    candidateId: candidate.id,
    durationMs: candidate.durationMs,
  };
};
