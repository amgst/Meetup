'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMeetings } from './meeting-provider';
import { InvitationDialog } from './invitation-dialog';
import type { Meeting } from '@/types/meeting';
export function MeetingList({ mode = 'all', limit }: { mode?: 'all' | 'upcoming' | 'previous'; limit?: number }) {
  const { meetings, ready, error, cancel, retry } = useMeetings();
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [message, setMessage] = useState('');
  const now = Date.now();
  const rows = meetings.filter(m => mode === 'all' || (mode === 'upcoming' ? m.scheduled && m.when > now : m.when <= now)).slice(0, limit);
  return <><div className="meetingPanel">{!ready ? <p className="empty" role="status">Loading meetings…</p> : rows.length ? rows.map(m => <div className="meetingRow" key={m.id}><div className="flex items-center gap-3"><div className="meetingIcon" aria-hidden>◉</div><div><div className="meetingName">{m.title}</div><div className="meetingMeta">{new Date(m.when).toLocaleString()} · {m.scheduled ? 'Scheduled' : 'Instant meeting'}</div>{m.notes && <p className="meetingMeta">{m.notes}</p>}</div></div><div className="flex flex-wrap gap-2"><button className="join" onClick={() => setSelected(m)}>Invite</button><Link className="join" href={`/room/${m.id}`}>Open</Link>{m.scheduled && m.when > now && <button className="join" onClick={async () => { if (window.confirm(`Cancel “${m.title}”?`)) { try { await cancel(m.id); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not cancel meeting.'); } } }}>Cancel</button>}</div></div>) : <p className="empty">No {mode === 'all' ? '' : mode + ' '}meetings yet.</p>}</div>{(error || message) && <p className="error" role="alert">{message || error}<button className="join ml-3" onClick={retry}>Retry</button></p>}{selected && <InvitationDialog meeting={selected} onClose={() => setSelected(null)} />}</>;
}
