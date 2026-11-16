'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient<Database> | undefined;
export function createClient() {
  const { url, key } = getSupabaseConfig();
  return client ??= createBrowserClient<Database>(url, key);
}
