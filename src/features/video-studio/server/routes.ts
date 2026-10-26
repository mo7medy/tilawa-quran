/* eslint-disable react-func/max-lines-per-function -- The method/path dispatch table groups the complete authenticated API contract. */
/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { StudioOwner } from '../contracts';
import { assert, record, StudioError, validateSpec } from '../validation';

import { automationRequest } from './automationApi';
import { catalog, resolveManifest } from './content';
import { checkRate, guestFromCookie } from './identity';
import { cancelJob, createJob, downloadUrl, getJob, jobView, manifestHash, quota } from './jobs';
import { deleteProject, getProject, listProjects, saveProject } from './projects';
import { publishingRequest } from './publishingApi';
import { readBody } from './requestBody';
import { json, StudioEnv } from './runtime';
import { getUpload, initUpload, receiveUpload } from './uploads';

export const authenticated = async (
  env: StudioEnv,
  req: Request,
  path: string[],
  owner: StudioOwner,
): Promise<Response> => {
  const [group, id, action] = path;
  const { method } = req;
  if (group === 'catalog' && method === 'GET') {
    return json(
      await catalog(env, new URL(req.url).searchParams.get('lang') === 'ar' ? 'ar' : 'en'),
    );
  }
  if (group === 'session' && method === 'GET') {
    return json({
      scope: owner.id,
      registered: owner.registered,
      canAutomate: !!owner.canAutomate,
      quota: await quota(env, owner),
    });
  }
  if (group === 'uploads' && method === 'PUT' && id) {
    await receiveUpload(env, owner, id, req);
    return json({ ok: true }, 202);
  }
  const body = ['POST', 'PUT', 'PATCH'].includes(method)
    ? record(JSON.parse(await readBody(req)))
    : {};
  if (group === 'automation') return automationRequest(env, req, owner, id, body);
  if (group === 'publishing') return publishingRequest(env, req, owner, id, body);
  if (group === 'resolve' && method === 'POST') {
    await checkRate(env, `resolve:${owner.network}`, 20);
    const manifest = await resolveManifest(env, owner, validateSpec(body.spec));
    return json({ manifest, hash: await manifestHash(manifest) });
  }
  if (group === 'projects') {
    if (method === 'GET') {
      return json(id ? await getProject(env, owner, id) : await listProjects(env, owner));
    }
    if (method === 'DELETE' && id) {
      await deleteProject(env, owner, id);
      return json({ ok: true });
    }
    if (method === 'POST' && action === 'claim') {
      const guest = await guestFromCookie(req, env);
      assert(owner.registered && guest, 'FORBIDDEN', 403);
      const source = await getProject(env, { ...owner, id: guest, registered: false }, id);
      // Copy the specification explicitly. Guest files retain their original owner and expiry.
      return json(await saveProject(env, owner, source.spec), 201);
    }
    if (method === 'POST' && !id) return json(await saveProject(env, owner, body.spec), 201);
    if (method === 'PUT' && id) return json(await saveProject(env, owner, body.spec, id));
  }
  if (group === 'uploads') {
    if (method === 'GET' && id) {
      const upload = await getUpload(env, owner, id);
      return json({ id, status: upload.status, expiresAt: upload.expires_at });
    }
    if (method === 'POST' && !id) {
      await checkRate(env, `upload:${owner.network}`, 10);
      return json(await initUpload(env, owner, String(body.mime), Number(body.size)), 201);
    }
  }
  if (group === 'jobs') {
    if (method === 'DELETE' && id) {
      const row = await getJob(env, owner, id);
      assert(['completed', 'failed', 'cancelled'].includes(row.status), 'OWNER_BUSY', 409);
      if (row.output_key) await env.VIDEO_STUDIO_PRIVATE.delete(row.output_key);
      await env.VIDEO_STUDIO_DB.prepare(
        "UPDATE studio_jobs SET status='expired',manifest='{}',output_key=NULL,output_size=0 WHERE id=? AND owner=?",
      )
        .bind(id, owner.id)
        .run();
      return json({ ok: true });
    }
    if (method === 'GET' && id && action === 'download') {
      return json({ url: await downloadUrl(env, await getJob(env, owner, id)) });
    }
    if (method === 'GET' && id) return json(jobView(await getJob(env, owner, id)));
    if (method === 'GET') {
      const rows = await env.VIDEO_STUDIO_DB.prepare(
        "SELECT * FROM studio_jobs WHERE owner=? AND expires_at>? AND status!='expired' ORDER BY created_at DESC LIMIT 100",
      )
        .bind(owner.id, Date.now())
        .all<Parameters<typeof jobView>[0]>();
      return json(rows.results.map(jobView));
    }
    if (method === 'POST' && !id) {
      await checkRate(env, `render:${owner.network}`, 10);
      return json(
        await createJob(
          env,
          owner,
          String(body.projectId),
          String(body.idempotency),
          String(body.hash),
        ),
        202,
      );
    }
    if (method === 'POST' && id && action === 'cancel') {
      await cancelJob(env, owner, id);
      return json({ ok: true }, 202);
    }
    if (method === 'POST' && id && action === 'retry') {
      const old = await getJob(env, owner, id);
      assert(old.status === 'failed', 'INVALID_STATE', 409);
      return json(
        await createJob(env, owner, old.project_id, String(body.idempotency), String(body.hash)),
        202,
      );
    }
  }
  throw new StudioError('NOT_FOUND', 404);
};
