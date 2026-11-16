'use client';
import { useState } from 'react';
import { LiveKitRoom,PreJoin,VideoConference,MediaDeviceSelect,useConnectionState,useParticipants,useSpeakingParticipants,type LocalUserChoices } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import { issueInvitation } from '@/app/(workspace)/invitation-actions';
function DeviceSettings(){
  return <section className="wbify-device-settings"><h3>Device settings</h3>{(['audioinput','videoinput','audiooutput'] as const).map(kind=><div key={kind}><label>{kind==='audioinput'?'Microphone':kind==='videoinput'?'Camera':'Speakers (where supported)'}</label><MediaDeviceSelect kind={kind} requestPermissions={false} /></div>)}</section>;
}
function RoomStatus(){
  const state=useConnectionState();const participants=useParticipants();const speakers=useSpeakingParticipants();
  return <div className="wbify-room-status"><span role="status">{state}</span><details><summary>Participants ({participants.length})</summary><ul>{participants.map(p=><li key={p.identity}>{p.name || 'Guest'}{speakers.some(s=>s.identity===p.identity)?' - speaking':''}</li>)}</ul></details></div>;
}
export function VideoRoom({roomId,name='',isHost=false,configured}:{roomId:string;name?:string;isHost?:boolean;configured:boolean}){
  const [preparing,setPreparing]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const [choices,setChoices]=useState<LocalUserChoices|null>(null);const [session,setSession]=useState<{token:string;serverUrl:string}|null>(null);
  async function join(values:LocalUserChoices){
    if(pending)return;setPending(true);setError('');
    try{
      const invitationToken=new URLSearchParams(window.location.hash.slice(1)).get('invite') || undefined;
      const response=await fetch('/api/livekit/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,name:values.username,invitationToken}),cache:'no-store'});
      const data=await response.json();if(!response.ok)throw new Error(data.error || 'Could not join meeting.');
      setChoices(values);setSession(data);
    }catch(err){setError(err instanceof Error?err.message:'Could not join the meeting.');}finally{setPending(false);}
  }
  async function copyInvite(){
    setError('');try{
      let url=window.location.href;
      if(isHost){const result=await issueInvitation(roomId,7);if(result.error)throw new Error(result.error);url=`${window.location.origin}/room/${roomId}#invite=${result.data!.token}`;}
      try{await navigator.clipboard.writeText(url);setMessage('Invitation link copied.');}catch{window.prompt('Copy this invitation link:',url);}
    }catch(err){setError(err instanceof Error?err.message:'Could not create invitation.');}
  }
  if(!configured)return <p className="mt-5 text-sm text-slate-400">Video setup is pending. Add LiveKit Cloud settings to enable calls. This invitation does not reserve a seat.</p>;
  if(session&&choices)return <div className="wbify-call" data-lk-theme="default"><header className="wbify-call-header"><strong>WBIFY Meet</strong><button className="join" onClick={copyInvite}>Copy invitation</button></header>{(error||message)&&<p role={error?'alert':'status'} className="wbify-call-message">{error||message}</p>}<LiveKitRoom serverUrl={session.serverUrl} token={session.token} audio={choices.audioEnabled?{deviceId:choices.audioDeviceId}:false} video={choices.videoEnabled?{deviceId:choices.videoDeviceId}:false} options={{adaptiveStream:true,dynacast:true,videoCaptureDefaults:{resolution:VideoPresets.h720.resolution}}} onDisconnected={()=>{setSession(null);setMessage('You left the meeting. You can join again below.');}} onError={()=>setError('Video connection interrupted. Check your network or leave and join again.')} onMediaDeviceFailure={()=>setError('A camera or microphone could not be opened. Check browser permissions and device settings.')}><RoomStatus /><VideoConference SettingsComponent={DeviceSettings} /></LiveKitRoom></div>;
  return <div className="mt-6" data-lk-theme="default">{error&&<p className="mb-4 text-sm text-rose-300" role="alert">{error}</p>}{message&&<p className="mb-4 text-sm text-slate-300" role="status">{message}</p>}{preparing?<><p className="mb-3 text-sm text-slate-400">Choose your name and devices. You can join with camera and microphone off.</p><div className={pending?'pointer-events-none opacity-60':''}><PreJoin defaults={{username:name,audioEnabled:false,videoEnabled:false}} persistUserChoices={false} onValidate={values=>!!values.username.trim()&&values.username.trim().length<=80} onSubmit={values=>void join(values)} onError={()=>setError('Device preview unavailable. Join with camera and microphone off, or check browser permissions.')} joinLabel={pending?'Joining...':'Join meeting'} /></div></>:<button className="action" onClick={()=>setPreparing(true)}>Set up devices</button>}</div>;
}
