'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import type { Meeting } from '@/types/meeting';
export function InvitationDialog({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const [status, setStatus] = useState('');
  const url = `${window.location.origin}/room/${meeting.id}`;
  async function copy() { try { await navigator.clipboard.writeText(url); setStatus('Invitation link copied.'); } catch { setStatus('Copy the link from the field above.'); } }
  return <Dialog title="Your meeting link is ready" onClose={onClose}><p className="muted">{meeting.title}</p><div className="formRow mt-5"><label htmlFor="invitation">Meeting link</label><input id="invitation" value={url} readOnly onFocus={e => e.target.select()} /></div><button className="action w-full justify-center" onClick={copy}>Copy invitation link</button><Link className="action secondary mt-3 w-full justify-center" href={`/room/${meeting.id}`}>Open meeting preview →</Link><p role="status" className="muted mt-3">{status}</p><p className="hint">This preview link does not start a video call yet.</p></Dialog>;
}
