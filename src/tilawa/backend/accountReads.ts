/* eslint-disable @typescript-eslint/naming-convention -- SQL/HTTP protocol fields. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { BackendError } from '@/lib/supabase/server';
import { signSnapshot } from '@/tilawa/backend/teachers';

export const readParameter = (value: string | string[] | undefined, fallback = ''): string => {
  if (Array.isArray(value)) throw new BackendError('INVALID_INPUT', 422);
  return value ?? fallback;
};
export const readPage = (value: string | string[] | undefined): number => {
  const page = readParameter(value, '1');
  if (!/^[1-9]\d{0,5}$/.test(page) || Number(page) > 100000) {
    throw new BackendError('INVALID_INPUT', 422);
  }
  return Number(page);
};
export const readUuid = (value: string | string[] | undefined): string | null => {
  const id = readParameter(value);
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new BackendError('INVALID_INPUT', 422);
  }
  return id || null;
};
export const handleAccountReads = async (
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient,
): Promise<void> => {
  const result = await client.rpc('tilawa_account_view', {
    p_view: readParameter(req.query.view, 'home'),
    p_id: readUuid(req.query.id),
    p_page: readPage(req.query.page),
    p_status: readParameter(req.query.status, 'all'),
  });
  if (result.error) throw result.error;
  res.json({ data: await signSnapshot(client, result.data) });
};

export const handleAdminReads = async (
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient,
  parts: string[],
): Promise<void> => {
  let result;
  if (parts.length === 2 && parts[1] === 'access') result = await client.rpc('tilawa_admin_access');
  else if (parts.length === 2 && parts[1] === 'health') {
    result = await client.rpc('tilawa_admin_health');
  } else if (parts.length === 3 && parts[1] === 'teacher') {
    const id = readUuid(parts[2]);
    if (!id) throw new BackendError('INVALID_INPUT', 422);
    result = await client.rpc('tilawa_admin_teacher', { p_id: id });
  } else if (parts.length === 3 && parts[1] === 'lists') {
    const from = readParameter(req.query.from);
    const until = readParameter(req.query.until);
    if (
      (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) ||
      (until && !/^\d{4}-\d{2}-\d{2}$/.test(until))
    ) {
      throw new BackendError('INVALID_INPUT', 422);
    }
    result = await client.rpc('tilawa_admin_list', {
      p_section: parts[2],
      p_search: readParameter(req.query.search),
      p_status: readParameter(req.query.status, 'all'),
      p_subject: readParameter(req.query.subject, 'all'),
      p_from: from || null,
      p_until: until || null,
      p_page: readPage(req.query.page),
    });
  } else throw new BackendError('NOT_FOUND', 404);
  if (result.error) throw result.error;
  res.json({ data: result.data });
};
