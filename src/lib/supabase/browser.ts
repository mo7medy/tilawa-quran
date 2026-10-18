import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfiguration } from './config';

let client: SupabaseClient | null = null;
let currentUserId: string | null = null;
export const setSessionUserId = (id: string | null): void => {
  currentUserId = id;
};
export const getSessionUserId = (): string | null => currentUserId;
export const getBrowserSupabase = (): SupabaseClient => {
  const config = getSupabaseConfiguration();
  if (!config) throw new Error('BACKEND_NOT_CONFIGURED');
  if (!client) client = createBrowserClient(config.url, config.publishableKey);
  return client;
};
