import { NextResponse,type NextRequest } from 'next/server';
import { z } from 'zod';
import { AgentDispatchClient,TrackSource } from 'livekit-server-sdk';
import { requestOrigin } from '@/lib/auth/request-origin';
import { roomIdSchema,invitationTokenSchema } from '@/lib/meetings/validation';
import { authorizeRoomParticipant } from '@/lib/livekit/authorize';
import { createRoomService,getLiveKitConfig,isLiveKitConfigured } from '@/lib/livekit/server';
const identity=z.string().regex(/^(user|guest)-[a-f0-9-]{36}$/);
const command=z.discriminatedUnion('action',[
  z.object({action:z.literal('hand'),raised:z.boolean()}),
  z.object({action:z.literal('lower-hand'),targetIdentity:identity}),
  z.object({action:z.literal('presenter'),targetIdentity:identity,enabled:z.boolean()}),
  z.object({action:z.literal('consent'),enabled:z.boolean()}),
  z.object({action:z.literal('transcription'),enabled:z.boolean()}),
]);
const schema=z.object({roomId:roomIdSchema,invitationToken:invitationTokenSchema.optional(),command});
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:NextRequest){
  if(request.headers.get('origin')!==requestOrigin(request))return json({error:'Invalid request origin.'},403);
  let input:z.infer<typeof schema>;
  try{const raw=await request.text();if(Buffer.byteLength(raw)>4096)return json({error:'Request too large.'},413);input=schema.parse(JSON.parse(raw));}catch{return json({error:'Invalid meeting action.'},400);}
  if(!isLiveKitConfigured())return json({error:'Video configuration is pending.'},503);
  try{
    const actor=await authorizeRoomParticipant(request,input.roomId,input.invitationToken);
    if(!actor)return json({error:'Your meeting access could not be verified. Rejoin using a valid invitation.'},403);
    const cmd=input.command;const hostAction=['presenter','lower-hand','transcription'].includes(cmd.action);
    if(hostAction&&!actor.isHost)return json({error:'Only the meeting host can do this.'},403);
    const service=createRoomService();
    // A stale cookie alone cannot act: the derived identity must be in this room.
    await service.getParticipant(input.roomId,actor.identity);
    if(cmd.action==='hand'||cmd.action==='lower-hand'){
      const target=cmd.action==='hand'?actor.identity:cmd.targetIdentity;const raised=cmd.action==='hand'&&cmd.raised;
      await service.updateParticipant(input.roomId,target,{attributes:{'wbify.hand':raised?'1':'0','wbify.handRaisedAt':raised?new Date().toISOString():''}});
    }else if(cmd.action==='consent'){
      await service.updateParticipant(input.roomId,actor.identity,{attributes:{'wbify.transcriptionConsent':cmd.enabled?'1':'0'}});
    }else if(cmd.action==='presenter'){
      if(cmd.targetIdentity===actor.identity)return json({error:'The host always has presenter permission.'},400);
      const target=await service.getParticipant(input.roomId,cmd.targetIdentity);
      const {data,error}=await actor.client.rpc('set_meeting_presenter',{p_meeting_id:input.roomId,p_identity:cmd.targetIdentity,p_enabled:cmd.enabled});
      if(error||!data)return json({error:'Presenter permission could not be saved. Check the latest database migration.'},503);
      await service.updateParticipant(input.roomId,cmd.targetIdentity,{attributes:{'wbify.presenter':cmd.enabled?'1':'0'},permission:{canPublish:true,canSubscribe:true,canPublishData:true,canUpdateMetadata:false,canPublishSources:cmd.enabled?[TrackSource.CAMERA,TrackSource.MICROPHONE,TrackSource.SCREEN_SHARE,TrackSource.SCREEN_SHARE_AUDIO]:[TrackSource.CAMERA,TrackSource.MICROPHONE]}});
      if(!cmd.enabled)for(const track of target.tracks)if([TrackSource.SCREEN_SHARE,TrackSource.SCREEN_SHARE_AUDIO].includes(track.source))await service.mutePublishedTrack(input.roomId,cmd.targetIdentity,track.sid,true);
    }else if(cmd.action==='transcription'){
      if(process.env.TRANSCRIPTION_ENABLED!=='true')return json({error:'The transcription worker is not enabled yet.'},503);
      const rooms=await service.listRooms([input.roomId]);if(!rooms[0])return json({error:'Meeting unavailable.'},404);
      let metadata:Record<string,unknown>={};try{const value=JSON.parse(rooms[0].metadata||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))metadata=value;}catch{ /* Preserve unrelated valid metadata only. */ }
      if(cmd.enabled){
        const config=getLiveKitConfig();const dispatch=new AgentDispatchClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);
        const agentName=process.env.TRANSCRIPTION_AGENT_NAME||'wbify-transcriber';
        const existing=await dispatch.listDispatch(input.roomId);
        if(!existing.some(item=>item.agentName===agentName))await dispatch.createDispatch(input.roomId,agentName);
      }
      await service.updateRoomMetadata(input.roomId,JSON.stringify({...metadata,'wbify.transcription':cmd.enabled?'active':'off'}));
      if(!cmd.enabled){
        const config=getLiveKitConfig();const dispatch=new AgentDispatchClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);
        const agentName=process.env.TRANSCRIPTION_AGENT_NAME||'wbify-transcriber';
        for(const item of await dispatch.listDispatch(input.roomId))if(item.agentName===agentName)await dispatch.deleteDispatch(item.id,input.roomId);
      }
    }
    return json({ok:true});
  }catch{return json({error:'The meeting action failed. Rejoin if your session expired, or retry.'},503);}
}
