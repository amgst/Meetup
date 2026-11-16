import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';
// Call inside server actions / route handlers when writing auth cookies.
// Phase 2 must add session refresh in the Next.js proxy and route protection.
export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => { for (const { name, value, options } of values) store.set(name, value, options); },
    },
  });
}
