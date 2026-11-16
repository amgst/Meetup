'use client';
import { useEffect,useRef,useState } from 'react';
import { RoomContext } from '@livekit/components-react';
import { ParticipantEvent,ParticipantKind,Room,RoomEvent } from 'livekit-client';
import { MeetingConference } from '@/components/video/meeting-conference';
export function ConferenceFixture(){
  const [room]=useState(()=>new Room());const [ready,setReady]=useState(false);const turn=useRef(0);
  useEffect(()=>{let active=true;
    const handlers=new Map<string,Parameters<typeof room.registerTextStreamHandler>[1]>();const original=room.registerTextStreamHandler.bind(room);
    room.registerTextStreamHandler=(topic,handler)=>{handlers.set(topic,handler);original(topic,handler);};
    room.localParticipant.publishData=async()=>{};
    room.simulateParticipants({publish:{audio:false,video:true,useRealTracks:false},participants:{count:8,audio:false,video:false}}).then(()=>{
      const controls={
        attributes(identity:string,values:Record<string,string>){const participant=identity==='local'?room.localParticipant:room.remoteParticipants.get(identity)!;const attrs={...participant.attributes,...values};Object.defineProperty(participant,'attributes',{configurable:true,get:()=>attrs});participant.emit(ParticipantEvent.AttributesChanged,values);room.emit(RoomEvent.ParticipantAttributesChanged,values,participant);},
        metadata(active:boolean){const metadata=JSON.stringify({'wbify.transcription':active?'active':'off'});Object.defineProperty(room,'metadata',{configurable:true,get:()=>metadata});room.emit(RoomEvent.RoomMetadataChanged,metadata);},
        async transcript(trusted:boolean){const participant=[...room.remoteParticipants.values()][0];Object.defineProperty(participant,'kind',{configurable:true,get:()=>trusted?ParticipantKind.AGENT:ParticipantKind.STANDARD});const text=JSON.stringify({id:trusted?'trusted-segment':'forged-segment',speakerIdentity:'speaker',speakerName:'Test speaker',text:trusted?'Hello from the transcript worker.':'Forged transcript',timestamp:new Date().toISOString()});const handler=handlers.get('wbify.transcript.v1');if(handler)await handler({info:{size:text.length},readAll:async()=>text} as Parameters<typeof handler>[0],{identity:participant.identity});},
      };
      (window as unknown as {wbifyFixture:typeof controls}).wbifyFixture=controls;
      if(active)setReady(true);
    });return()=>{active=false;void room.disconnect();};},[room]);
  function speak(){
    const participants=[...room.remoteParticipants.values()];
    const selected=participants[turn.current++%participants.length];
    participants.forEach(p=>p.setIsSpeaking(p===selected));
    room.emit(RoomEvent.ActiveSpeakersChanged,[selected]);
    // Simulate a fresh track list arriving in another order.
    room.remoteParticipants.clear();participants.reverse().forEach(p=>room.remoteParticipants.set(p.identity,p));
    room.emit(RoomEvent.ParticipantConnected,selected);
  }
  return <div className="wbify-call" data-lk-theme="default"><header className="wbify-call-header"><strong>Layout test simulation</strong><button className="join" onClick={speak} disabled={!ready}>Change active speaker</button></header>{ready?<RoomContext.Provider value={room}><MeetingConference roomId="wbify-preview-fixture01" isHost SettingsComponent={()=> <p className="wbify-device-settings">Device settings</p>} /></RoomContext.Provider>:<p role="status">Preparing simulation...</p>}</div>;
}
