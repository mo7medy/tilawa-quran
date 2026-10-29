/* eslint-disable @typescript-eslint/naming-convention -- Durable SQLite field names. */
import { automationClock } from '../automation';
import type { DistributionMode } from '../multiPublishing';

import type { StudioEnv } from './runtime';

export interface MultiControl {
  active: number;
  maintenance: number;
  mode: DistributionMode;
  next_mode: DistributionMode;
  effective_day: string;
  cutover_day: string;
}
export const multiControl = async (env: StudioEnv): Promise<MultiControl | null> => {
  try {
    return await env.VIDEO_STUDIO_DB.prepare(
      'SELECT * FROM studio_multi_control WHERE id=1',
    ).first<MultiControl>();
  } catch (error) {
    // First compatible deployment precedes the additive migration. Other DB errors fail closed.
    if (error instanceof Error && /no such table: studio_multi_control/.test(error.message)) {
      return null;
    }
    throw error;
  }
};
export const tomorrowCairo = (now = Date.now()): string => {
  const { day } = automationClock(now);
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
};
export const legacySqlGuard = async (env: StudioEnv): Promise<string> =>
  (await multiControl(env))
    ? ` AND NOT EXISTS(SELECT 1 FROM studio_multi_control WHERE active=1 OR maintenance=1 OR cutover_day!='')`
    : '';
export const auditStudio = async (
  env: StudioEnv,
  actor: string,
  owner: string,
  action: string,
  subject: string,
  detail: Record<string, string | number | boolean> = {},
): Promise<void> => {
  await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_studio_audit(id,actor,owner,action,subject,detail,created_at) VALUES(?,?,?,?,?,?,?)',
  )
    .bind(crypto.randomUUID(), actor, owner, action, subject, JSON.stringify(detail), Date.now())
    .run();
};

export const SQL_UUID = `lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(6)))`;
