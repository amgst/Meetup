'use server';
import { createClient } from '@/lib/supabase/server';
import { invitationTokenSchema,roomIdSchema } from '@/lib/meetings/validation';
import type { GuestMeeting } from '@/types/meeting';
export async function inspectInvitation(id:string,token:string):Promise<{data:GuestMeeting|null;error?:string}> {
  if(!roomIdSchema.safeParse(id).success || !invitationTokenSchema.safeParse(token).success)return {data:null};
  const client=await createClient();
  const {data,error}=await client.rpc('validate_meeting_invitation',{p_meeting_id:id,p_token:token});
  if(error)return {data:null,error:'Unable to check this invitation. Please retry later.'};
  return {data:data[0] || null};
}
