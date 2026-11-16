import 'server-only';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLiveKitConfig } from './server';
import { guestIdentity } from './token';
// Identity is derived from a verified account or the signed join cookie, never input.
export async function authorizeRoomParticipant(request:NextRequest,roomId:string,invitationToken?:string){
  const client=await createClient();const {data:{user}}=await client.auth.getUser();
  const {data:owned,error}=user?.email_confirmed_at?await client.from('meetings').select('id,status,locked').eq('id',roomId).eq('owner_id',user.id).maybeSingle():{data:null,error:null};
  if(error)throw new Error('Unable to check the meeting.');
  if(owned){if(owned.status!=='active')return null;return {client,isHost:true,identity:`user-${user!.id}`};}
  if(!invitationToken)return null;
  const {data:invite,error:inviteError}=await client.rpc('validate_meeting_invitation',{p_meeting_id:roomId,p_token:invitationToken});
  if(inviteError)throw new Error('Unable to check the invitation.');if(!invite.length)return null;
  const cookie=request.cookies.get(`wbify-guest-${roomId}`)?.value;if(!cookie)return null;
  const signed=guestIdentity(cookie,roomId,getLiveKitConfig().apiSecret);
  if(signed.cookie!==cookie)return null;
  return {client,isHost:false,identity:signed.identity};
}
