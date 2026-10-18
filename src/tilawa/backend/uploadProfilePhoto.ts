/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import { getBrowserSupabase } from '@/lib/supabase/browser';

export const uploadDataPhoto = async (value: string, userId: string): Promise<string> => {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(value);
  if (!match) throw new Error('INVALID_PHOTO');
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  if (bytes.length > 5 * 1024 * 1024) throw new Error('INVALID_PHOTO');
  const path = `${userId}/${crypto.randomUUID()}.${match[1].split('/')[1]}`;
  const { error } = await getBrowserSupabase()
    .storage.from('tilawa-avatars')
    .upload(path, bytes, { contentType: match[1], upsert: false });
  if (error) throw new Error('PHOTO_UPLOAD_FAILED');
  return path;
};
