'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Meeting } from '@/types/meeting';
import { loadMeetings, createMeeting, cancelMeeting } from '@/app/(workspace)/actions';
type Store = { meetings: Meeting[]; ready: boolean; error: string; create: (input: Omit<Meeting,'id'>) => Promise<Meeting>; cancel: (id: string) => Promise<void>; retry: () => void };
const Context = createContext<Store | null>(null);
export function MeetingProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadMeetings().then(result => {
      if (!active) return;
      if (result.error) { setError(result.error); setMeetings([]); }
      else { setMeetings(result.data!); setError(''); }
    }).catch(() => { if (active) setError('Could not load meetings. Check your connection and retry.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [attempt]);
  async function create(input: Omit<Meeting, 'id'>) {
    const result = await createMeeting(input);
    if (result.error || !result.data) throw new Error(result.error || 'Could not save this meeting.');
    setMeetings(current => [result.data!, ...current]);
    return result.data;
  }
  async function cancel(id: string) {
    const result = await cancelMeeting(id);
    if (result.error) throw new Error(result.error);
    setMeetings(current => current.filter(m => m.id !== id));
  }
  function retry() { setReady(false); setAttempt(value => value + 1); }
  return <Context.Provider value={{ meetings, ready, error, create, cancel, retry }}>{children}</Context.Provider>;
}
export function useMeetings() { const value = useContext(Context); if (!value) throw new Error('MeetingProvider is required'); return value; }
