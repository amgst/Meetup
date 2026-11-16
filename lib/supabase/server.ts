import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';
import type { Database } from '@/types/database';
export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => {
        try { for (const { name, value, options } of values) store.set(name, value, options); }
        catch { /* Server Components cannot write cookies. proxy.ts handles refresh. */ }
      },
    },
  });
}
