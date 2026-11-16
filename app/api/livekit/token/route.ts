import { NextResponse,type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { roomIdSchema,invitationTokenSchema } from '@/lib/meetings/validation';
import { createRoomService,getLiveKitConfig,isLiveKitConfigured } from '@/lib/livekit/server';
import { guestIdentity,maxParticipants,mintParticipantToken } from '@/lib/livekit/token';
import { requestOrigin } from '@/lib/auth/request-origin';
export const runtime='nodejs';
const schema=z.object({roomId:roomIdSchema,invitationToken:invitationTokenSchema.optional(),name:z.string().trim().min(1).max(80)});
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin || origin!==requestOrigin(request))return json({error:'This request must come from the meeting website.'},403);
  if(Number(request.headers.get('content-length') || 0)>4096)return json({error:'Request too large.'},413);
  let input:z.infer<typeof schema>;
  try{input=schema.parse(await request.json());}catch{return json({error:'Enter a valid meeting and display name.'},400);}
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  const {data:owned,error:lookupError}=user?.email_confirmed_at?await client.from('meetings').select('id,status,locked').eq('id',input.roomId).eq('owner_id',user.id).maybeSingle():{data:null,error:null};
  if(lookupError)return json({error:'Unable to check the meeting. Please retry.'},503);
  const isHost=!!owned;
  if(owned && (owned.status!=='active'||owned.locked))return json({error:'This meeting is unavailable.'},403);
  if(!isHost){
    if(!input.invitationToken)return json({error:'A valid invitation is required.'},403);
    const {data,error}=await client.rpc('validate_meeting_invitation',{p_meeting_id:input.roomId,p_token:input.invitationToken});
    if(error)return json({error:'Unable to check the invitation. Please retry.'},503);
    if(!data.length)return json({error:'This invitation is unavailable or expired.'},403);
  }
  if(!isLiveKitConfigured())return json({error:'Video is not configured yet. The host must add LiveKit Cloud settings.'},503);
  try{
    const config=getLiveKitConfig();const service=createRoomService();
    const room=await service.createRoom({name:input.roomId,maxParticipants,emptyTimeout:600,departureTimeout:60});
    if(room.maxParticipants!==maxParticipants)return json({error:'Room capacity settings need administrator attention.'},503);
    const cookieName=`wbify-guest-${input.roomId}`;
    const guest=guestIdentity(request.cookies.get(cookieName)?.value,input.roomId,config.apiSecret);
    const identity=isHost?`user-${user!.id}`:guest.identity;
    const participants=await service.listParticipants(input.roomId);
    if(participants.length>=maxParticipants && !participants.some(p=>p.identity===identity))return json({error:'This meeting is full. Please try again after someone leaves.'},409);
    let presenter=isHost;
    if(!isHost){
      const {data,error}=await client.rpc('meeting_presenter_access',{p_meeting_id:input.roomId,p_identity:identity,p_token:input.invitationToken!});
      if(error)return json({error:'Presenter permissions need the latest database migration. Please contact the host.'},503);
      presenter=data;
    }
    const token=await mintParticipantToken(config,input.roomId,identity,input.name,isHost,presenter);
    const response=json({token,serverUrl:config.url});
    if(!isHost)response.cookies.set(cookieName,guest.cookie,{httpOnly:true,sameSite:'strict',secure:new URL(requestOrigin(request)).protocol==='https:',maxAge:86400,path:'/api/livekit'});
    return response;
  }catch{return json({error:'Unable to connect to the video service. Check the LiveKit project settings and retry.'},503);}
}
