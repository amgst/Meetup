import { AccessToken, RoomConfiguration } from 'livekit-server-sdk';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
export const maxParticipants = 10;
export function guestIdentity(cookie:string|undefined,meetingId:string,secret:string) {
  const sign=(value:string)=>createHmac('sha256',secret).update(`${meetingId}:${value}`).digest('base64url');
  if(cookie){
    const [id,expires,signature]=cookie.split('.');
    const value=`${id}.${expires}`;
    const expected=Buffer.from(sign(value));const actual=Buffer.from(signature || '');
    if(/^guest-[a-f0-9-]{36}$/.test(id) && Number(expires)>Date.now() && expected.length===actual.length && timingSafeEqual(expected,actual))return {identity:id,cookie};
  }
  const identity=`guest-${randomUUID()}`;const value=`${identity}.${Date.now()+86400000}`;
  return {identity,cookie:`${value}.${sign(value)}`};
}
export async function mintParticipantToken(config:{apiKey:string;apiSecret:string},room:string,identity:string,name:string,isHost:boolean) {
  const token=new AccessToken(config.apiKey,config.apiSecret,{identity,name,ttl:'5m',metadata:JSON.stringify({role:isHost?'host':'guest'})});
  token.addGrant({roomJoin:true,room,canPublish:true,canSubscribe:true,canPublishData:true,roomAdmin:false,canUpdateOwnMetadata:false});
  // Preserve the cap if the room disappears between token issuance and join.
  token.roomConfig=new RoomConfiguration({name:room,maxParticipants,emptyTimeout:600,departureTimeout:60});
  return token.toJwt();
}
