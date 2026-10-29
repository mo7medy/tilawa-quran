/* eslint-disable import/prefer-default-export -- One bounded Cron dispatcher. */
import { maintainAutomation } from './automationRunner';
import { maintainStudio } from './maintenance';
import { maintainPublishing } from './publishingRunner';
import { StudioEnv } from './runtime';

// Keep independent work under the Free-plan invocation budget, on the existing minute trigger.
// Each lane runs once every three minutes; durable leases handle overlaps and retries.
export const maintainScheduledStudio = async (
  env: StudioEnv,
  scheduledTime: number,
): Promise<void> => {
  const lane = Math.floor(scheduledTime / 60000) % 3;
  if (lane === 0) await maintainAutomation(env);
  else if (lane === 1) await maintainPublishing(env);
  else await maintainStudio(env);
};
