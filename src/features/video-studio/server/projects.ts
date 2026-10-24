/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { StudioOwner, StudioProject } from '../contracts';
import { policy, assert, validateSpec } from '../validation';

import { StudioEnv } from './runtime';

interface ProjectRow {
  id: string;
  revision: number;
  spec: string;
  expires_at: number;
  updated_at: number;
}
export const projectView = (row: ProjectRow): StudioProject => ({
  id: row.id,
  revision: row.revision,
  spec: JSON.parse(row.spec),
  expiresAt: row.expires_at,
  updatedAt: row.updated_at,
});
export const getProject = async (
  env: StudioEnv,
  owner: StudioOwner,
  id: string,
): Promise<StudioProject> => {
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_projects WHERE id=? AND owner=? AND expires_at>?',
  )
    .bind(id, owner.id, Date.now())
    .first<ProjectRow>();
  assert(row, 'NOT_FOUND', 404);
  return projectView(row);
};
export const listProjects = async (
  env: StudioEnv,
  owner: StudioOwner,
): Promise<StudioProject[]> => {
  const rows = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT * FROM studio_projects WHERE owner=? AND expires_at>? ORDER BY updated_at DESC LIMIT 100',
  )
    .bind(owner.id, Date.now())
    .all<ProjectRow>();
  return rows.results.map(projectView);
};
export const saveProject = async (
  env: StudioEnv,
  owner: StudioOwner,
  input: unknown,
  id?: string,
): Promise<StudioProject> => {
  const spec = validateSpec(input);
  const now = Date.now();
  const expires = now + policy(owner.registered).projectMs;
  if (id) await getProject(env, owner, id);
  const key = id ?? crypto.randomUUID();
  const row = await env.VIDEO_STUDIO_DB.prepare(
    'INSERT INTO studio_projects(id,owner,registered,spec,updated_at,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET spec=excluded.spec,revision=revision+1,updated_at=excluded.updated_at,expires_at=excluded.expires_at WHERE owner=excluded.owner RETURNING *',
  )
    .bind(key, owner.id, Number(owner.registered), JSON.stringify(spec), now, expires)
    .first<ProjectRow>();
  assert(row, 'NOT_FOUND', 404);
  return projectView(row);
};
export const deleteProject = async (
  env: StudioEnv,
  owner: StudioOwner,
  id: string,
): Promise<void> => {
  await getProject(env, owner, id);
  const active = await env.VIDEO_STUDIO_DB.prepare(
    "SELECT id FROM studio_jobs WHERE project_id=? AND owner=? AND status IN ('queued','preparing','rendering','uploading','cancel_requested')",
  )
    .bind(id, owner.id)
    .first();
  assert(!active, 'OWNER_BUSY', 409);
  const jobs = await env.VIDEO_STUDIO_DB.prepare(
    'SELECT output_key FROM studio_jobs WHERE project_id=? AND owner=? AND output_key IS NOT NULL',
  )
    .bind(id, owner.id)
    .all<{ output_key: string }>();
  await Promise.all(jobs.results.map((j) => env.VIDEO_STUDIO_PRIVATE.delete(j.output_key)));
  await env.VIDEO_STUDIO_DB.batch([
    // Retain the accounting row: deleting a project must never reset today's quota.
    env.VIDEO_STUDIO_DB.prepare(
      "UPDATE studio_jobs SET status='expired',manifest='{}',output_key=NULL,output_size=0 WHERE project_id=? AND owner=?",
    ).bind(id, owner.id),
    env.VIDEO_STUDIO_DB.prepare('DELETE FROM studio_projects WHERE id=? AND owner=?').bind(
      id,
      owner.id,
    ),
  ]);
};
