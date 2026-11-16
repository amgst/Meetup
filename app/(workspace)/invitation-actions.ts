'use server';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/user';
import { roomIdSchema } from '@/lib/meetings/validation';
import type { Invitation } from '@/types/meeting';
type Result<T> = { data:T; error?:never } | { error:string; data?:never };
function failure(code?:string) {
  if(code==='PGRST202') return 'Apply the Phase 3 migration in Supabase SQL Editor, then retry.';
  if(code==='54000') return 'This meeting has 20 active links. Revoke one before creating another.';
  return 'Meeting unavailable or request failed. Reload and retry.';
}
export async function listInvitations(id:string): Promise<Result<Invitation[]>> {
  const { client } = await requireUser();
  if(!roomIdSchema.safeParse(id).success)return {error:'Invalid meeting.'};
  const {data,error}=await client.rpc('list_own_invitations',{p_meeting_id:id});
  return error ? {error:failure(error.code)} : {data};
}
export async function issueInvitation(id:string,days:number): Promise<Result<{ token:string; expiresAt:string }>> {
  const {client}=await requireUser();
  if(!roomIdSchema.safeParse(id).success || ![1,7,30].includes(days))return {error:'Choose a valid meeting and expiry.'};
  const token=randomBytes(32).toString('base64url');
  // Small margin avoids time drift between app and DB at the 30-day boundary.
  const expiresAt=new Date(Date.now()+days*86400000-60000).toISOString();
  const {error}=await client.rpc('issue_meeting_invitation',{p_meeting_id:id,p_token_hash:createHash('sha256').update(token).digest('hex'),p_expires_at:expiresAt});
  return error ? {error:failure(error.code)} : {data:{token,expiresAt}};
}
export async function revokeInvitation(id:string): Promise<Result<boolean>> {
  const {client}=await requireUser();
  if(!z.uuid().safeParse(id).success)return {error:'Invalid invitation.'};
  const {data,error}=await client.rpc('revoke_own_invitation',{p_invitation_id:id});
  return error ? {error:failure(error.code)} : data ? {data:true} : {error:'Invitation unavailable or already revoked.'};
}
