'use client';
import { useState } from 'react';
import { useMeetings } from './meeting-provider';
import { InvitationDialog } from './invitation-dialog';
import type { Meeting } from '@/types/meeting';
export function ScheduleForm() {
  const { create, ready } = useMeetings();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState('');
  return <><form className="formCard" onSubmit={e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const when = new Date(String(data.get('date'))).getTime();
    if (!Number.isFinite(when) || when <= Date.now()) { setError('Choose a future date and time.'); return; }
    try { const created = create({ title: String(data.get('title')).trim(), when, scheduled: true, notes: String(data.get('notes')).trim() }); setMeeting(created); setError(''); form.reset(); }
    catch { setError('Could not save the meeting. Check your title and browser storage.'); }
  }}><div className="formRow"><label htmlFor="title">Meeting title</label><input id="title" name="title" maxLength={80} required placeholder="e.g. Weekly product sync" /></div><div className="formRow"><label htmlFor="date">Date and time</label><input id="date" name="date" type="datetime-local" required /><p className="hint">Time is shown in your device’s local timezone.</p></div><div className="formRow"><label htmlFor="notes">Meeting notes (optional)</label><textarea id="notes" name="notes" maxLength={180} placeholder="What will you discuss?" /></div>{error && <p role="alert" className="error">{error}</p>}<button className="action" disabled={!ready}>Create meeting link →</button></form>{meeting && <InvitationDialog meeting={meeting} onClose={() => setMeeting(null)} />}</>;
}
