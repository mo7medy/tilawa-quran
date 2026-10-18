/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-await-in-loop -- Sequential bounded operations preserve order and avoid bursts of upstream requests. */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import type { Row } from './mappers';
import { normalizeRange, verseOrdinal } from './quranRanges';

import { BackendError } from '@/lib/supabase/server';

export const quranContext = (
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient,
  user: User,
  path: string[],
) => {
  const route = path.join('/');
  const get = req.method === 'GET';
  const body: Row = req.body && typeof req.body === 'object' ? req.body : {};
  const { query } = req;
  const read = async (table: string): Promise<Row[]> => {
    const result: Row[] = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      let request = client.from(table).select('*').eq('user_id', user.id);
      if (table === 'quran_collection_bookmarks') {
        request = request.order('collection_id').order('bookmark_id');
      } else if (table === 'quran_note_ranges') {
        request = request.order('note_id').order('range');
      } else if (table === 'quran_preferences') {
        request = request.order('mushaf_id').order('preference_group');
      } else request = request.order('id');
      const { data, error } = await request.range(offset, offset + 999);
      if (error) throw error;
      result.push(...data);
      if (data.length < 1000) return result;
    }
    throw new BackendError('ACCOUNT_QUERY_TOO_LARGE', 422);
  };
  const command = async (action: string, input: Row): Promise<Row> => {
    let payload = input;
    if (Array.isArray(payload.ranges)) {
      payload = {
        ...payload,
        ranges: payload.ranges.map((range) => normalizeRange(String(range))),
      };
    }
    if (action === 'session.save') verseOrdinal(`${payload.chapterNumber}:${payload.verseNumber}`);
    const { data, error } = await client.rpc('tilawa_quran_command', { action, payload });
    if (error) throw error;
    return data as Row;
  };
  return { req, res, client, user, path, route, get, body, query, read, command };
};
export type QuranContext = ReturnType<typeof quranContext>;
