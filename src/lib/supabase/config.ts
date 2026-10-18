export interface SupabaseConfiguration {
  url: string;
  publishableKey: string;
}
export const getSupabaseConfiguration = (): SupabaseConfiguration | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
};
export const isSupabaseConfigured = (): boolean => getSupabaseConfiguration() !== null;
