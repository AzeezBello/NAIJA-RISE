// Supabase clients for the web shell. The browser client uses the public anon key (row-level security keeps every
// player to their own rows, see ../../supabase/schema.sql); the admin client uses the service role key and must only
// run on the server. Both read their settings from the environment, so a missing key degrades to "offline".
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const cloudEnabled = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | null = null;
export function browserSupabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  browserClient ??= createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
  return browserClient;
}

export function adminSupabase(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
