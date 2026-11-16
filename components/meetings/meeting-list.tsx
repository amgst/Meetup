'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMeetings } from './meeting-provider';
import { InvitationDialog } from './invitation-dialog';
import { EditMeetingDialog } from './edit-meeting-dialog';
import type { Meeting } from '@/types/meeting';
export function MeetingList({mode='all',limit}:{mode?:'all'|'upcoming'|'previous';limit?:number}){
  const {meetings,ready,error,cancel,retry}=useMeetings();
  const [selected,setSelected]=useState<Meeting|null>(null);const [editing,setEditing]=useState<Meeting|null>(null);
  const [message,setMessage]=useState('');const [pending,setPending]=useState('');
  const [filter,setFilter]=useState('active');const [search,setSearch]=useState('');
  const now=Date.now();
  const rows=meetings.filter(m=>{
    if(mode!=='all')return m.status==='active'&&(mode==='upcoming'?m.scheduled&&m.when>now:m.when<=now);
    return (filter==='cancelled'?m.status==='cancelled':filter==='previous'?m.status!=='cancelled'&&m.when<=now:filter==='upcoming'?m.status==='active'&&m.scheduled&&m.when>now:m.status==='active')&&m.title.toLowerCase().includes(search.toLowerCase());
  }).sort((a,b)=>mode==='upcoming'||filter==='upcoming'?a.when-b.when:0).slice(0,limit);
  return <>{mode==='all'&&<div className="mb-5 flex flex-wrap items-center gap-3"><div className="flex flex-wrap gap-2" aria-label="Meeting filters">{['active','upcoming','previous','cancelled'].map(value=><button className={`join ${filter===value?'!bg-indigo-600 !text-white':''}`} key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><label className="ml-auto text-sm">Search meetings<input className="ml-2 rounded-lg border border-slate-200 bg-white p-2" value={search} onChange={e=>setSearch(e.target.value)} type="search" /></label></div>}<div className="meetingPanel">{!ready?<p className="empty" role="status">Loading meetings...</p>:rows.length?rows.map(m=><div className="meetingRow" key={m.id}><div className="flex min-w-0 items-center gap-3"><div className="meetingIcon" aria-hidden>&#9673;</div><div className="min-w-0"><div className="meetingName break-words">{m.title}</div><div className="meetingMeta">{new Date(m.when).toLocaleString()} &middot; {m.status==='cancelled'?'Cancelled':m.scheduled?'Scheduled':'Instant meeting'}</div>{m.notes&&<p className="meetingMeta break-words">{m.notes}</p>}</div></div>{m.status==='active'&&<div className="flex flex-wrap gap-2"><button className="join" onClick={()=>setSelected(m)}>Invite</button><Link className="join" href={`/room/${m.id}`}>Open</Link>{(!m.scheduled||m.when>now)&&<button className="join" onClick={()=>setEditing(m)}>Edit</button>}{m.scheduled&&m.when>now&&<button className="join" disabled={pending===m.id} onClick={async()=>{if(!window.confirm(`Cancel "${m.title}" and revoke all its invitations?`))return;setPending(m.id);setMessage('');try{await cancel(m.id);}catch(err){setMessage(err instanceof Error?err.message:'Could not cancel meeting.');}finally{setPending('');}}}>{pending===m.id?'Cancelling...':'Cancel'}</button>}</div>}</div>):<p className="empty">No {mode==='all'?filter:mode} meetings found.</p>}</div>{(error||message)&&<p className="error" role="alert">{message||error}<button className="join ml-3" onClick={retry}>Retry</button></p>}{selected&&<InvitationDialog meeting={selected} onClose={()=>setSelected(null)} />}{editing&&<EditMeetingDialog meeting={editing} onClose={()=>setEditing(null)} />}</>;
}
