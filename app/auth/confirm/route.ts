import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) return new NextResponse(null,{status:303,headers:{Location:type === 'recovery' ? '/reset-password' : '/dashboard','Cache-Control':'no-store'}});
  }
  return new NextResponse(null,{status:303,headers:{Location:'/login?error=link','Cache-Control':'no-store'}});
}
