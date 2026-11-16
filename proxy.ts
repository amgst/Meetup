import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/types/database';
import { requestOrigin } from '@/lib/auth/request-origin';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  const { url, key } = getSupabaseConfig();
  const client = createServerClient<Database>(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values, headers) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      response.headers.set('Cache-Control', 'private, no-store');
    },
  } });
  const { data: { user } } = await client.auth.getUser();
  const protectedPath = /^\/(dashboard|meetings|settings|reset-password)(\/|$)/.test(request.nextUrl.pathname);
  if (protectedPath && (!user || !user.email_confirmed_at)) {
    const target = new URL(user ? '/verify-email' : '/login', requestOrigin(request));
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    for (const name of ['cache-control','expires','pragma']) {
      const value = response.headers.get(name); if (value) redirect.headers.set(name,value);
    }
    return redirect;
  }
  return response;
}
export const config = { matcher: ['/dashboard/:path*','/meetings/:path*','/settings/:path*','/reset-password','/auth/:path*'] };
