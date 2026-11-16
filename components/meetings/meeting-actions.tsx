'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMeetings } from './meeting-provider';
import { Dialog } from '@/components/ui/dialog';
import { InvitationDialog } from './invitation-dialog';
import { invitationPath } from '@/lib/meetings/validation';
import type { Meeting } from '@/types/meeting';
export function MeetingActions({ hero = false }: { hero?: boolean }) {
  const { create, ready } = useMeetings();
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function instant() {
    if(pending)return; setPending(true);
    try { setSelected(await create({ title: 'Instant meeting', when: Date.now(), scheduled: false, notes: '' })); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save meeting.'); } finally { setPending(false); }
  }
  return <>{hero ? <button className="action" disabled={!ready || pending} onClick={instant}>✚ New meeting</button> : <div className="cards"><div className="card"><div className="cardicon">◉</div><h4>Instant meeting</h4><p>Prepare a meeting link and invite your team.</p><button disabled={!ready || pending} onClick={instant}>Start meeting →</button></div><div className="card"><div className="cardicon">◷</div><h4>Schedule for later</h4><p>Plan ahead with a title, time, and meeting notes.</p><Link className="text-xs font-extrabold text-indigo-600" href="/meetings/schedule">Schedule meeting →</Link></div><div className="card"><div className="cardicon">↗</div><h4>Join a meeting</h4><p>Have an invitation? Enter a meeting link or room code.</p><button onClick={() => { setError(''); setJoining(true); }}>Join meeting →</button></div></div>}{error && !joining && <p className="error" role="alert">{error}</p>}{selected && <InvitationDialog meeting={selected} onClose={() => setSelected(null)} />}{joining && <Dialog title="Join a meeting" onClose={() => setJoining(false)}><p className="muted">Paste a WBIFY Meet invitation or room code.</p><form className="mt-5" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); try { router.push(invitationPath(String(data.get('room')))); } catch { setError('Enter a valid WBIFY Meet link or room code.'); } }}><div className="formRow"><label htmlFor="joinCode">Invitation link or room code</label><input id="joinCode" name="room" required autoFocus /></div>{error && <p className="error" role="alert">{error}</p>}<button className="action" type="submit">Open preview →</button></form></Dialog>}</>;
}
