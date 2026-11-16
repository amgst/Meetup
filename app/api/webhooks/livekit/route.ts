import { NextResponse,type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createWebhookReceiver,isLiveKitConfigured } from '@/lib/livekit/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/types/database';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  if(!isLiveKitConfigured())return new NextResponse('Webhook configuration pending',{status:503});
  if(Number(request.headers.get('content-length')||0)>262144)return new NextResponse('Too large',{status:413});
  const body=await request.text();if(Buffer.byteLength(body)>262144)return new NextResponse('Too large',{status:413});
  let event;
  try{event=await createWebhookReceiver().receive(body,request.headers.get('authorization') || undefined);}
  catch{return new NextResponse('Invalid signature',{status:401});}
  if(!['room_started','room_finished','participant_joined','participant_left'].includes(event.event))return new NextResponse(null,{status:204});
  if(!event.id||!event.room?.name||!event.room.sid||!event.createdAt)return new NextResponse('Invalid event',{status:400});
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serviceKey)return new NextResponse('Webhook persistence is not configured',{status:503});
  const {url}=getSupabaseConfig();
  const admin=createClient<Database>(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await admin.rpc('record_livekit_event',{
    p_id:event.id,p_kind:event.event,p_room_id:event.room.name,p_room_sid:event.room.sid,
    p_identity:event.participant?.identity || '',p_name:event.participant?.name || 'Guest',
    p_when:new Date(Number(event.createdAt)*1000).toISOString(),
  });
  if(error)return new NextResponse('Event could not be recorded',{status:503});
  return NextResponse.json({received:true},{headers:{'Cache-Control':'no-store'}});
}
