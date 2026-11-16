import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authDestination } from '@/lib/auth/validation';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return new NextResponse(null,{status:303,headers:{Location:authDestination(request.nextUrl.searchParams.get('next')),'Cache-Control':'no-store'}});
  }
  return new NextResponse(null,{status:303,headers:{Location:'/login?error=link','Cache-Control':'no-store'}});
}
