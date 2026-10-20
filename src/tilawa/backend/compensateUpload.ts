/* eslint-disable import/prefer-default-export, @typescript-eslint/naming-convention -- Named compensation helper and RPC parameter names. */
import { getBrowserSupabase, getSessionUserId } from '@/lib/supabase/browser';
import { TilawaRequestError } from '@/tilawa/backend/http';

/** Only compensate a definitively rejected save, not an in-flight/ambiguous transport failure. */
export const compensateUpload = async (
  bucket: string,
  path: string,
  owner: string,
  failure: unknown,
): Promise<void> => {
  if (
    !(failure instanceof TilawaRequestError) ||
    failure.status < 400 ||
    failure.status >= 500 ||
    failure.status === 409 ||
    failure.status === 401 ||
    getSessionUserId() !== owner
  ) {
    return;
  }
  const client = getBrowserSupabase();
  const result = await client.rpc('tilawa_upload_referenced', { p_bucket: bucket, p_path: path });
  if (!result.error && result.data === false && getSessionUserId() === owner) {
    await client.storage.from(bucket).remove([path]);
  }
};
