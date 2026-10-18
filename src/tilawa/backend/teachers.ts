/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapTeacher, object, rows, string } from './mappers';
import type { Row } from './mappers';

import { getSupabaseConfiguration } from '@/lib/supabase/config';
import type { AcademyTeacherProfile } from '@/tilawa/teachers';

export const signAvatar = async (client: SupabaseClient, row: Row): Promise<Row> => {
  const path = string(row.avatar_path);
  if (!path) return row;
  const { data } = await client.storage.from('tilawa-avatars').createSignedUrl(path, 600);
  return { ...row, avatar_url: data?.signedUrl ?? '' };
};
export const signSnapshot = async (client: SupabaseClient, snapshot: Row): Promise<Row> => ({
  ...snapshot,
  profile: await signAvatar(client, object(snapshot.profile)),
  teachers: await Promise.all(rows(snapshot.teachers).map((t) => signAvatar(client, t))),
  people: await Promise.all(rows(snapshot.people).map((p) => signAvatar(client, p))),
});
export const loadPublicTeachers = async (): Promise<AcademyTeacherProfile[]> => {
  const config = getSupabaseConfiguration();
  if (!config) return [];
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc('tilawa_public_teachers');
  if (error) throw new Error('TEACHERS_UNAVAILABLE');
  return (await Promise.all(rows(data).map((t) => signAvatar(client, t)))).map(mapTeacher);
};
