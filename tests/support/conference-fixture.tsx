'use client';
import { useEffect,useRef,useState } from 'react';
import { RoomContext } from '@livekit/components-react';
import { Room,RoomEvent } from 'livekit-client';
import { MeetingConference } from '@/components/video/meeting-conference';
export function ConferenceFixture(){
  const [room]=useState(()=>new Room());const [ready,setReady]=useState(false);const turn=useRef(0);
  useEffect(()=>{let active=true;room.simulateParticipants({publish:{audio:false,video:true,useRealTracks:false},participants:{count:8,audio:false,video:false}}).then(()=>{if(active)setReady(true);});return()=>{active=false;void room.disconnect();};},[room]);
  function speak(){
    const participants=[...room.remoteParticipants.values()];
    const selected=participants[turn.current++%participants.length];
    participants.forEach(p=>p.setIsSpeaking(p===selected));
    room.emit(RoomEvent.ActiveSpeakersChanged,[selected]);
    // Simulate a fresh track list arriving in another order.
    room.remoteParticipants.clear();participants.reverse().forEach(p=>room.remoteParticipants.set(p.identity,p));
    room.emit(RoomEvent.ParticipantConnected,selected);
  }
  return <div className="wbify-call" data-lk-theme="default"><header className="wbify-call-header"><strong>Layout test simulation</strong><button className="join" onClick={speak} disabled={!ready}>Change active speaker</button></header>{ready?<RoomContext.Provider value={room}><MeetingConference SettingsComponent={()=> <p className="wbify-device-settings">Device settings</p>} /></RoomContext.Provider>:<p role="status">Preparing simulation...</p>}</div>;
}
