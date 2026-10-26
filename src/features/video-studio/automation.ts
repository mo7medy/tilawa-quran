import type { VideoProjectSpec } from './contracts';

export const AUTOMATION_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
export const AUTOMATION_HOURS = [9, 14, 19] as const;
export const AUTOMATION_GAP_MS = 5 * 3600000;
export interface AutomationPlan {
  spec: VideoProjectSpec;
  caption: string;
  hashtags: string[];
  candidateId: string;
  durationMs: number;
}
export interface AutomationSettings {
  owner: string;
  enabled: boolean;
  optionalThird: boolean;
  activatedAt: number;
}
export interface AutomationRun {
  id: string;
  day: string;
  slot: number;
  status: 'queued' | 'planning' | 'ready' | 'submitted' | 'completed' | 'skipped' | 'failed';
  attempt: number;
  error: string | null;
  plan: AutomationPlan | null;
  projectId: string | null;
  jobId: string | null;
  createdAt: number;
}
export interface AutomationState {
  configured: boolean;
  settings: AutomationSettings | null;
  runs: AutomationRun[];
  aiCallsToday: number;
}

/**
 * Cairo's IANA zone also handles the annual daylight-saving change. No fixed UTC offset.
 * @returns {{day: string; hour: number}} date and hour in Cairo
 */
export const automationClock = (now: number): { day: string; hour: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return { day: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')) };
};
export const dueAutomationSlot = (now: number): number =>
  AUTOMATION_HOURS.indexOf(automationClock(now).hour as (typeof AUTOMATION_HOURS)[number]);
