// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { maintainAutomation } from './automationRunner';
import { maintainStudio } from './maintenance';
import { maintainPublishing } from './publishingRunner';
import { StudioEnv } from './runtime';
import { maintainScheduledStudio } from './scheduledStudio';

vi.mock('./automationRunner', () => ({ maintainAutomation: vi.fn() }));
vi.mock('./maintenance', () => ({ maintainStudio: vi.fn() }));
vi.mock('./publishingRunner', () => ({ maintainPublishing: vi.fn() }));

it('runs one budget-isolated lane per minute and every lane within three minutes', async () => {
  const env = {} as StudioEnv;
  await maintainScheduledStudio(env, 0);
  expect(maintainAutomation).toHaveBeenCalledOnce();
  expect(maintainPublishing).not.toHaveBeenCalled();
  expect(maintainStudio).not.toHaveBeenCalled();
  await maintainScheduledStudio(env, 60000);
  expect(maintainPublishing).toHaveBeenCalledOnce();
  expect(maintainStudio).not.toHaveBeenCalled();
  await maintainScheduledStudio(env, 120000);
  expect(maintainStudio).toHaveBeenCalledOnce();
  await maintainScheduledStudio(env, 180000);
  expect(maintainAutomation).toHaveBeenCalledTimes(2);
});
