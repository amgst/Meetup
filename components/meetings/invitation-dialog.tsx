'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import { issueInvitation, listInvitations, revokeInvitation } from '@/app/(workspace)/invitation-actions';
import type { Invitation, Meeting } from '@/types/meeting';
export function InvitationDialog({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [days,setDays]=useState(7);
  const [pending,setPending]=useState(false);
  const [loading,setLoading]=useState(true);
  const [links,setLinks]=useState<Invitation[]>([]);
  const [issued,setIssued]=useState<{token:string;expiresAt:string}|null>(null);
  useEffect(()=>{let active=true;listInvitations(meeting.id).then(result=>{if(!active)return;if(result.error)setError(result.error);else setLinks(result.data!);}).catch(()=>{if(active)setError('Unable to load invitation links.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[meeting.id]);
  async function refresh(){const result=await listInvitations(meeting.id);if(result.error)throw new Error(result.error);setLinks(result.data!);}
  const url=issued ? `${window.location.origin}/room/${meeting.id}#invite=${issued.token}` : '';
  async function generate(){setPending(true);setError('');setStatus('');try{const result=await issueInvitation(meeting.id,days);if(result.error)throw new Error(result.error);setIssued(result.data!);await refresh();}catch(err){setError(err instanceof Error?err.message:'Could not create link.');}finally{setPending(false);}}
  async function copy(){try{await navigator.clipboard.writeText(url);setStatus('Invitation link copied.');}catch{setStatus('Select and copy the link from the field.');}}
  return <Dialog title="Meeting invitations" onClose={onClose}><div className="max-h-[75vh] overflow-y-auto pr-1"><p className="muted">{meeting.title}</p><p className="hint mt-3">Anyone with a valid link can view the meeting invitation. Keep it private. The meeting page shows whether video is configured.</p><div className="formRow mt-5"><label htmlFor="expiry">Link expires in</label><select className="rounded-lg border border-slate-200 p-3" id="expiry" value={days} onChange={e=>setDays(Number(e.target.value))}>{[1,7,30].map(value=><option key={value} value={value}>{value} {value===1?'day':'days'}</option>)}</select></div><button className="action" onClick={generate} disabled={pending}>{pending?'Please wait...':'Create invitation link'}</button>{issued && <><div className="formRow mt-5"><label htmlFor="invitation">Meeting link</label><input id="invitation" value={url} readOnly onFocus={e=>e.target.select()} /><p className="hint">Expires {new Date(issued.expiresAt).toLocaleString()}. Copy now; this secret cannot be retrieved after closing.</p></div><button className="action" onClick={copy}>Copy invitation link</button></>}<Link className="action secondary mt-3" href={`/room/${meeting.id}`}>Open meeting preview</Link>{error && <p role="alert" className="error">{error}</p>}<p role="status" className="muted mt-3">{status}</p><h3 className="mt-6 mb-3 text-sm font-bold">Issued links</h3>{loading?<p className="muted" role="status">Loading links...</p>:links.length===0?<p className="hint">No links issued yet.</p>:links.map(item=>{const revoked=!!item.revoked_at;const expired=Date.parse(item.expires_at)<=Date.now();return <div className="mb-3 rounded-lg border border-slate-200 p-3" key={item.id}><p className="text-xs">Created {new Date(item.created_at).toLocaleString()}</p><p className="hint">{revoked?'Revoked':expired?'Expired':`Expires ${new Date(item.expires_at).toLocaleString()}`}</p>{!revoked&&!expired&&<button className="join mt-2" disabled={pending} onClick={async()=>{setPending(true);setError('');try{const result=await revokeInvitation(item.id);if(result.error)throw new Error(result.error);setIssued(null);setStatus('Invitation revoked.');await refresh();}catch(err){setError(err instanceof Error?err.message:'Could not revoke link.');}finally{setPending(false);}}}>Revoke link</button>}</div>;})}</div></Dialog>;
}
