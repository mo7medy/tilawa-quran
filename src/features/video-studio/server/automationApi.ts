/* eslint-disable import/prefer-default-export -- Named workflow entrypoints keep server imports explicit. */
import { StudioOwner } from '../contracts';
import { assert, StudioError } from '../validation';

import { enqueueAutomation } from './automationSchedule';
import { configureAutomation, readAutomation, readAutomationSettings } from './automationStore';
import { checkRate } from './identity';
import { multiControl } from './multiControl';
import { json, StudioEnv } from './runtime';

export const automationRequest = async (
  env: StudioEnv,
  req: Request,
  owner: StudioOwner,
  action: string | undefined,
  body: Record<string, unknown>,
): Promise<Response> => {
  assert(owner.registered && owner.canAutomate, 'FORBIDDEN', 403);
  if (req.method === 'GET' && !action) return json(await readAutomation(env, owner));
  if (req.method === 'PUT' && !action) {
    await checkRate(env, `automation:${owner.id}`, 10);
    await configureAutomation(env, owner, body.enabled, body.optionalThird);
    return json(await readAutomation(env, owner));
  }
  if (req.method === 'POST' && action === 'run') {
    assert(!(await multiControl(env))?.active, 'PUBLISHING_REFRESH_REQUIRED', 409);
    await checkRate(env, `automation-run:${owner.id}`, 3);
    const settings = await readAutomationSettings(env);
    assert(
      settings?.owner === owner.id && settings.enabled && env.AI && env.STUDIO_ENABLED === '1',
      'AUTOMATION_PAUSED',
      409,
    );
    const id = await enqueueAutomation(env, settings, Date.now(), true);
    return json({ id }, 202);
  }
  throw new StudioError('NOT_FOUND', 404);
};
