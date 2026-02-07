import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Browser Supabase client (anon key). Used only for uploading files to signed URLs
 * so file bytes never hit the server and we avoid the 4.5 MB request limit.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  _client = createClient(url, anonKey, { auth: { persistSession: false } });
  return _client;
}
