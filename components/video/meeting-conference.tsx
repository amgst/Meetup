'use client';
import { useRef,useState } from 'react';
import { Chat,ChatToggle,ConnectionStateToast,ControlBar,LayoutContextProvider,ParticipantTile,RoomAudioRenderer,useCreateLayoutContext,useTracks,type TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { RoomEvent,Track } from 'livekit-client';
type View='grid'|'spotlight'|'sidebar';
const trackKey=(track:TrackReferenceOrPlaceholder)=>`${track.participant.identity}:${track.source}`;
export function MeetingConference({SettingsComponent}:{SettingsComponent:React.ComponentType}){
  const [view,setView]=useState<View>('grid');
  const [selected,setSelected]=useState('');
  const [showChat,setShowChat]=useState(false);
  const order=useRef(new Map<string,number>());
  const layout=useCreateLayoutContext();
  // Speaking changes update each tile's indicator, never its place or page.
  const tracks=useTracks([{source:Track.Source.Camera,withPlaceholder:true},{source:Track.Source.ScreenShare,withPlaceholder:false}],{
    onlySubscribed:false,
    updateOnlyOn:[RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected,RoomEvent.TrackPublished,RoomEvent.TrackUnpublished,RoomEvent.TrackSubscribed,RoomEvent.TrackUnsubscribed,RoomEvent.LocalTrackPublished,RoomEvent.LocalTrackUnpublished],
  });
  for(const track of tracks){const key=trackKey(track);if(!order.current.has(key))order.current.set(key,order.current.size);}
  const stable=[...tracks].sort((a,b)=>order.current.get(trackKey(a))!-order.current.get(trackKey(b))!);
  const focus=stable.some(t=>trackKey(t)===selected)?selected:stable[0]?trackKey(stable[0]):'';
  return <LayoutContextProvider value={layout} onWidgetChange={state=>setShowChat(state.showChat)}><section className="wbify-conference" aria-label="Meeting video"><div className="wbify-view-toolbar"><label>View <select aria-label="View" value={view} onChange={e=>setView(e.target.value as View)}><option value="grid">Grid</option><option value="spotlight">Spotlight</option><option value="sidebar">Sidebar</option></select></label>{view!=='grid'&&<label>Focus <select aria-label="Focus" value={focus} onChange={e=>setSelected(e.target.value)}>{stable.map(track=><option key={trackKey(track)} value={trackKey(track)}>{track.participant.name||'Guest'}{track.source===Track.Source.ScreenShare?' - screen share':''}</option>)}</select></label>}<ChatToggle className="wbify-chat-toggle">Chat</ChatToggle><details className="wbify-settings"><summary>Devices</summary><SettingsComponent /></details></div><div className="wbify-stage"><div className={`wbify-tiles wbify-view-${view}`} data-view={view} data-count={stable.length} style={{'--sidebar-rows':Math.max(1,stable.length-1)} as React.CSSProperties}>{stable.map(track=><div key={trackKey(track)} data-track-key={trackKey(track)} data-source={track.source} className={`wbify-tile ${trackKey(track)===focus?'wbify-focused':''}`}><ParticipantTile trackRef={track} onParticipantClick={()=>{setSelected(trackKey(track));setView('spotlight');}} /></div>)}{!stable.length&&<p role="status" className="wbify-no-tracks">Waiting for participants...</p>}</div><aside className="wbify-chat-panel" aria-label="Meeting chat" style={{display:showChat?'flex':'none'}}><Chat /></aside></div><ControlBar controls={{chat:false,settings:false}} saveUserChoices={false} /><RoomAudioRenderer /><ConnectionStateToast /></section></LayoutContextProvider>;
}
