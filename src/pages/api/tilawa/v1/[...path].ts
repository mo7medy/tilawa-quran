/* eslint-disable max-lines -- Central API dispatch with feature handlers split into separate modules. */
/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  BackendError,
  protectRequest,
  requireUser,
  respondError,
  serverSupabase,
} from '@/lib/supabase/server';
import { handleAccountReads, handleAdminReads } from '@/tilawa/backend/accountReads';
import { handleAdminReports } from '@/tilawa/backend/adminReports';
import { rows } from '@/tilawa/backend/mappers';
import { handleMushafMapping } from '@/tilawa/backend/mushafMapping';
import { handleQuranAccount } from '@/tilawa/backend/quran';
import { signAvatar, signSnapshot } from '@/tilawa/backend/teachers';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    protectRequest(req, res);
    const client = serverSupabase(req, res);
    const parts = Array.isArray(req.query.path) ? req.query.path : [];
    const path = parts.join('/');
    if (req.method === 'GET' && ['teachers', 'plans', 'settings'].includes(path)) {
      const result =
        path === 'teachers'
          ? await client.rpc('tilawa_public_teachers')
          : await client.from(path === 'plans' ? 'academy_plans' : 'platform_settings').select('*');
      if (result.error) throw result.error;
      const data =
        path === 'teachers'
          ? await Promise.all(rows(result.data).map((t) => signAvatar(client, t)))
          : result.data;
      res.status(200).json({ data });
      return;
    }
    if (req.method === 'GET' && path === 'quran/goal/count') {
      const { data, error } = await client.rpc('tilawa_goal_count', {
        category: String(req.query.type ?? 'QURAN'),
      });
      if (error) throw error;
      res.json({ data: { count: Number(data) } });
      return;
    }
    if (req.method === 'POST' && path === 'quran/mushaf/map') {
      await handleMushafMapping(req, res);
      return;
    }
    const user = await requireUser(client);
    if (req.headers['x-tilawa-user'] && req.headers['x-tilawa-user'] !== user.id) {
      throw new BackendError('ACCOUNT_CHANGED', 409);
    }
    if (
      req.method === 'GET' &&
      parts[0] === 'admin' &&
      parts[1] === 'reports' &&
      parts.length === 3
    ) {
      await handleAdminReports(req, res, client, parts[2]);
      return;
    }
    if (parts[0] === 'quran') {
      await handleQuranAccount(req, res, client, user, parts.slice(1));
      return;
    }
    if (req.method === 'GET' && path === 'account/view') {
      await handleAccountReads(req, res, client);
      return;
    }
    if (req.method === 'GET' && parts[0] === 'admin' && parts.length > 1) {
      await handleAdminReads(req, res, client, parts);
      return;
    }
    if (req.method === 'GET' && ['account', 'admin'].includes(path)) {
      const { data, error } = await client.rpc(
        path === 'account' ? 'tilawa_account_bootstrap' : 'tilawa_admin_snapshot',
      );
      if (error) throw error;
      res.status(200).json({
        data: {
          ...(path === 'account' ? await signSnapshot(client, data) : data),
          email: user.email ?? '',
          hasPassword: (user.app_metadata.providers ?? []).includes('email'),
        },
      });
      return;
    }
    if (req.method === 'GET' && path === 'slots') {
      const date = String(req.query.date ?? '');
      const zone = String(req.query.zone ?? 'UTC');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BackendError('INVALID_INPUT', 422);
      let format: Intl.DateTimeFormat;
      try {
        format = new Intl.DateTimeFormat('en-CA', { timeZone: zone });
      } catch {
        throw new BackendError('INVALID_TIME_ZONE', 422);
      }
      const start = new Date(`${date}T12:00:00Z`);
      if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
        throw new BackendError('INVALID_INPUT', 422);
      }
      start.setUTCDate(start.getUTCDate() - 2);
      const { data, error } = await client.rpc('tilawa_available_slots', {
        teacher_id: req.query.teacher,
        start_date: start.toISOString().slice(0, 10),
        days: 5,
        duration: Number(req.query.duration),
      });
      if (error) throw error;
      res
        .status(200)
        .json({ data: (data as string[]).filter((at) => format.format(new Date(at)) === date) });
      return;
    }
    if (req.method === 'GET' && path === 'messages') {
      const id = String(req.query.conversation ?? '');
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new BackendError('INVALID_INPUT', 422);
      const conversation = await client
        .from('direct_conversations')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (!conversation.data) throw new BackendError('NOT_FOUND', 404);
      let request = client
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(51);
      if (req.query.before) {
        const time = new Date(String(req.query.before));
        const cursor = String(req.query.cursor ?? '');
        if (!Number.isFinite(time.getTime()) || !/^[0-9a-f-]{36}$/.test(cursor)) {
          throw new BackendError('INVALID_INPUT', 422);
        }
        request = request.or(
          `created_at.lt.${time.toISOString()},and(created_at.eq.${time.toISOString()},id.lt.${cursor})`,
        );
      }
      const { data, error } = await request;
      if (error) throw error;
      const items = data.slice(0, 50);
      const last = items[items.length - 1];
      res.json({
        data: {
          items,
          hasMore: data.length > 50,
          nextCursor:
            data.length > 50 && last ? { before: last.created_at, cursor: last.id } : null,
        },
      });
      return;
    }
    if (req.method === 'POST' && path === 'command') {
      const { action, payload, requestKey } = req.body ?? {};
      if (
        typeof action !== 'string' ||
        typeof payload !== 'object' ||
        !payload ||
        typeof requestKey !== 'string'
      ) {
        throw new BackendError('INVALID_INPUT', 422);
      }
      const { data, error } = await client.rpc('tilawa_command', {
        action,
        payload,
        request_key: requestKey,
      });
      if (error) throw error;
      res.status(200).json({ data });
      return;
    }
    throw new BackendError('NOT_FOUND', 404);
  } catch (error) {
    respondError(res, error);
  }
}
