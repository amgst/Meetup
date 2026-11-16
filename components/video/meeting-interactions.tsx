'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useLocalParticipant,useParticipantAttributes,useParticipants,useRoomContext } from '@livekit/components-react';
import { ParticipantKind,RoomEvent,type RemoteParticipant } from 'livekit-client';
import { reactionEmoji,reactionSchema,transcriptSchema,transcriptTopic,type TranscriptLine } from '@/lib/livekit/interaction-protocol';
type Command={action:'hand';raised:boolean}|{action:'lower-hand';targetIdentity:string}|{action:'presenter';targetIdentity:string;enabled:boolean}|{action:'consent';enabled:boolean}|{action:'transcription';enabled:boolean};
export function MeetingInteractions({roomId,isHost}:{roomId:string;isHost:boolean}){
  const room=useRoomContext();const {localParticipant}=useLocalParticipant();
  const {attributes}=useParticipantAttributes({participant:localParticipant});
  const participants=useParticipants({updateOnlyOn:[RoomEvent.ParticipantAttributesChanged,RoomEvent.ParticipantPermissionsChanged]});
  const [panel,setPanel]=useState<'people'|'transcript'|null>(null);const [pending,setPending]=useState(false);const [error,setError]=useState('');
  const [reactions,setReactions]=useState<{id:number;emoji:string;name:string;expires:number}[]>([]);
  const [lines,setLines]=useState<TranscriptLine[]>([]);const [transcribing,setTranscribing]=useState(false);
  const lastSent=useRef(0);const received=useRef(new Map<string,number>());const sequence=useRef(0);
  const raised=attributes?.['wbify.hand']==='1';const consent=attributes?.['wbify.transcriptionConsent']==='1';
  const command=useCallback(async(cmd:Command)=>{
    setPending(true);setError('');
    try{
      const invitationToken=new URLSearchParams(window.location.hash.slice(1)).get('invite')||undefined;
      const response=await fetch('/api/livekit/interactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,invitationToken,command:cmd})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Meeting action failed.');
    }catch(err){setError(err instanceof Error?err.message:'Meeting action failed.');}
    finally{setPending(false);}
  },[roomId]);
  useEffect(()=>{
    const update=()=>{try{setTranscribing(JSON.parse(room.metadata||'{}')['wbify.transcription']==='active');}catch{setTranscribing(false);}};
    update();room.on(RoomEvent.RoomMetadataChanged,update);return()=>{room.off(RoomEvent.RoomMetadataChanged,update);};
  },[room]);
  function showReaction(emoji:string,name:string){const now=Date.now();setReactions(current=>[...current.filter(item=>item.expires>now).slice(-7),{id:sequence.current++,emoji,name,expires:now+4500}]);}
  useEffect(()=>{
    const onData=(payload:Uint8Array,participant?:RemoteParticipant,_kind?:unknown,topic?:string)=>{
      if(topic!=='wbify.reaction.v1'||!participant||payload.byteLength>128)return;
      try{const result=reactionSchema.safeParse(JSON.parse(new TextDecoder().decode(payload)));if(!result.success)return;const now=Date.now();if(now-(received.current.get(participant.identity)||0)<1000)return;received.current.set(participant.identity,now);showReaction(result.data.emoji,participant.name||'Guest');}catch{ /* Ignore malformed/untrusted data. */ }
    };
    room.on(RoomEvent.DataReceived,onData);const timer=setInterval(()=>setReactions(current=>current.filter(item=>item.expires>Date.now())),1000);
    return()=>{room.off(RoomEvent.DataReceived,onData);clearInterval(timer);};
  },[room]);
  useEffect(()=>{
    const handler:Parameters<typeof room.registerTextStreamHandler>[1]=async(reader,sender)=>{
      // Only framework agents may publish transcript text. A guest cannot forge it.
      const participant=room.remoteParticipants.get(sender.identity);
      if(!participant||participant.kind!==ParticipantKind.AGENT)return;
      if(reader.info.size&&reader.info.size>16000)return;
      try{
        const raw=await reader.readAll();if(raw.length>16000)return;
        const parsed=transcriptSchema.safeParse(JSON.parse(raw));if(!parsed.success)return;
        setLines(current=>current.some(line=>line.id===parsed.data.id)?current:[...current,parsed.data].slice(-2000));
      }catch{ /* Interrupted/invalid streams are not transcript entries. */ }
    };
    room.registerTextStreamHandler(transcriptTopic,handler);return()=>room.unregisterTextStreamHandler(transcriptTopic);
  },[room]);
  async function react(emoji:typeof reactionEmoji[number]){
    if(Date.now()-lastSent.current<1000)return;lastSent.current=Date.now();setError('');
    try{await localParticipant.publishData(new TextEncoder().encode(JSON.stringify({emoji})),{reliable:true,topic:'wbify.reaction.v1'});showReaction(emoji,'You');}catch{setError('Could not send reaction. Check your connection.');}
  }
  function download(){const text=lines.map(line=>`[${new Date(line.timestamp).toLocaleTimeString()}] ${line.speakerName}: ${line.text}`).join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wbify-meeting-transcript.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const hands=participants.filter(p=>p.attributes['wbify.hand']==='1').sort((a,b)=>(a.attributes['wbify.handRaisedAt']||'').localeCompare(b.attributes['wbify.handRaisedAt']||''));
  return <><div className="wbify-interactions"><button aria-pressed={raised} disabled={pending} onClick={()=>void command({action:'hand',raised:!raised})}>{raised?'Lower hand':'Raise hand'}{hands.length?` (${hands.length})`:''}</button><details className="wbify-reaction-picker"><summary>Reactions</summary><div>{reactionEmoji.map(emoji=><button key={emoji} onClick={()=>void react(emoji)} aria-label={`React ${emoji}`}>{emoji}</button>)}</div></details><button aria-expanded={panel==='people'} onClick={()=>setPanel(panel==='people'?null:'people')}>{isHost?'People & presenters':'People'}</button><button aria-expanded={panel==='transcript'} onClick={()=>setPanel(panel==='transcript'?null:'transcript')}>Transcript{transcribing?' · Active':''}</button>{error&&<p role="alert">{error}</p>}</div>{transcribing&&<div className="wbify-transcription-notice">Transcription is active. Only participants who opt in are included.<button disabled={pending} onClick={()=>void command({action:'consent',enabled:!consent})}>{consent?'Withdraw my consent':'Allow my audio to be transcribed'}</button></div>}<div className="wbify-reaction-overlay" aria-live="polite" aria-atomic="false">{reactions.map(item=><span key={item.id}>{item.emoji} <small>{item.name}</small></span>)}</div>{panel&&<aside className="wbify-interaction-panel" aria-label={panel==='people'?'People and permissions':'Meeting transcript'}><header><h3>{panel==='people'?'People and presenter permissions':'Meeting transcript'}</h3><button aria-label="Close meeting panel" onClick={()=>setPanel(null)}>Close</button></header>{panel==='people'?<><p className="wbify-panel-hint">Presenters can share their screen. Everyone can still use their camera and microphone.</p>{hands.length>0&&<p className="wbify-panel-hint">Hands raised: {hands.map(p=>p.name||'Guest').join(', ')}</p>}<ul>{participants.filter(p=>p.kind!==ParticipantKind.AGENT).map(p=><li key={p.identity}><strong>{p.name||'Guest'}</strong>{p.attributes['wbify.hand']==='1'&&<span> · Hand raised</span>}<p>{p.attributes['wbify.presenter']==='1'?'Presenter':'Participant'}</p>{isHost&&p.identity!==localParticipant.identity&&<div><button disabled={pending} onClick={()=>void command({action:'presenter',targetIdentity:p.identity,enabled:p.attributes['wbify.presenter']!=='1'})}>{p.attributes['wbify.presenter']==='1'?'Stop presenting':'Allow presenting'}</button>{p.attributes['wbify.hand']==='1'&&<button disabled={pending} onClick={()=>void command({action:'lower-hand',targetIdentity:p.identity})}>Lower hand</button>}</div>}</li>)}</ul></>:<><p className="wbify-panel-hint">{transcribing?'Transcription requested. Text appears when the worker is connected and consenting participants speak.':'Transcription is off. The host can start the speech-to-text worker.'} Transcript text is kept in this browser session; download it before leaving. Late joiners do not receive earlier text.</p>{isHost&&<button disabled={pending} onClick={()=>void command({action:'transcription',enabled:!transcribing})}>{transcribing?'Stop transcription':'Start transcription'}</button>}<button disabled={!lines.length} onClick={download}>Download transcript</button><ol className="wbify-transcript-lines">{lines.map(line=><li key={line.id}><strong>{line.speakerName}</strong><time>{new Date(line.timestamp).toLocaleTimeString()}</time><p>{line.text}</p></li>)}</ol>{!lines.length&&<p className="wbify-panel-hint">No transcript received yet.</p>}</>}</aside>}</>;
}
