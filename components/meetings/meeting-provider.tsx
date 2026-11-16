'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Meeting } from '@/types/meeting';
import { meetingSchema } from '@/lib/meetings/validation';
const key = 'wbify-next-preview-meetings-v1';
type Store = { meetings: Meeting[]; ready: boolean; error: string; create: (input: Omit<Meeting, 'id'>) => Meeting; cancel: (id: string) => void };
const Context = createContext<Store | null>(null);
export function MeetingProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(saved)) throw new Error();
      const valid = saved.filter((m): m is Meeting => !!m && typeof m.id === 'string' && /^wbify-preview-[a-z0-9-]{8,64}$/i.test(m.id) && typeof m.title === 'string' && typeof m.when === 'number' && Number.isFinite(m.when) && typeof m.scheduled === 'boolean' && typeof m.notes === 'string');
      setMeetings(valid);
    } catch { setError('Saved preview meetings could not be read. New meetings can still be created.'); }
    setReady(true);
  }, []);
  function persist(next: Meeting[]) {
    localStorage.setItem(key, JSON.stringify(next));
    setMeetings(next);
  }
  function create(input: Omit<Meeting, 'id'>) {
    const data = meetingSchema.parse(input);
    const meeting = { ...data, id: `wbify-preview-${crypto.randomUUID()}` };
    persist([meeting, ...meetings]);
    return meeting;
  }
  function cancel(id: string) { persist(meetings.filter(m => m.id !== id)); }
  return <Context.Provider value={{ meetings, ready, error, create, cancel }}>{children}</Context.Provider>;
}
export function useMeetings() { const value = useContext(Context); if (!value) throw new Error('MeetingProvider is required'); return value; }
