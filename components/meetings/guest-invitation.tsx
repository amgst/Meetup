'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { inspectInvitation } from '@/app/room/actions';
import { MeetingEntry } from '@/components/video/meeting-entry';
import type { GuestMeeting } from '@/types/meeting';
export function GuestInvitation({roomId,configured}:{roomId:string;configured:boolean}){
  const [meeting,setMeeting]=useState<GuestMeeting|null>(null);const [status,setStatus]=useState('Checking invitation...');const [pending,setPending]=useState(true);
  const generation=useRef(0);
  const check=useCallback(async()=>{
    const current=++generation.current;
    const token=new URLSearchParams(window.location.hash.slice(1)).get('invite');
    setPending(true);
    if(!token){setMeeting(null);setStatus('A complete invitation link from the host is required. A room code alone does not grant access.');setPending(false);return;}
    try{const result=await inspectInvitation(roomId,token);if(current!==generation.current)return;if(result.error)setStatus(result.error);else if(result.data){setMeeting(result.data);setStatus('Invitation verified.');}else{setMeeting(null);setStatus('Invitation unavailable. It may have expired, been revoked, or the meeting may be cancelled or locked.');}}
    catch{if(current===generation.current)setStatus('Unable to check the invitation. Check your connection and retry.');}finally{if(current===generation.current)setPending(false);}
  },[roomId]);
  useEffect(()=>{void check();const refresh=()=>{void check();};window.addEventListener('hashchange',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('hashchange',refresh);window.removeEventListener('focus',refresh);};},[check]);
  useEffect(()=>{if(!meeting)return;const timeout=setTimeout(()=>{void check();},Math.min(2147483647,Math.max(0,Date.parse(meeting.expires_at)-Date.now())));return()=>clearTimeout(timeout);},[meeting,check]);
  return <><p role="status" className="mt-5 text-slate-300">{status}</p>{meeting&&<div className="mt-6 rounded-lg bg-slate-800 p-5"><h2 className="text-xl font-bold">{meeting.title}</h2><p className="mt-2 text-sm text-slate-300">{new Date(meeting.starts_at).toLocaleString()} - {meeting.scheduled?'Scheduled':'Instant meeting'}</p><MeetingEntry roomId={roomId} configured={configured} /></div>}<button className="action mt-6" disabled={pending} onClick={()=>void check()}>{pending?'Checking...':'Check invitation again'}</button></>;
}
