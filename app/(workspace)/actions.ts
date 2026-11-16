'use server';
import { requireUser } from '@/lib/auth/user';
import { meetingSchema, roomIdSchema } from '@/lib/meetings/validation';
import { profileSchema } from '@/lib/auth/validation';
import type { Meeting } from '@/types/meeting';
import { revalidatePath } from 'next/cache';
type Result<T> = { data: T; error?: never } | { error: string; data?: never };
function dbMessage(code?: string) {
  return ['42P01','42703','PGRST204','PGRST205','PGRST202'].includes(code || '')
    ? 'Database setup is pending. Apply the Phase 2 migration in Supabase SQL Editor, then retry.'
    : 'The request could not be saved. Please retry.';
}
export async function loadMeetings(): Promise<Result<Meeting[]>> {
  const { client, user } = await requireUser();
  const { data, error } = await client.from('meetings').select('id,title,starts_at,scheduled,notes,status').eq('owner_id', user.id).neq('status','cancelled').order('created_at', { ascending: false });
  if (error) return { error: dbMessage(error.code) };
  return { data: data.map(m => ({ id: m.id, title: m.title, when: new Date(m.starts_at).getTime(), scheduled: m.scheduled, notes: m.notes })) };
}
export async function createMeeting(input: unknown): Promise<Result<Meeting>> {
  const { client, user } = await requireUser();
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const m = { ...parsed.data, id: `wbify-preview-${crypto.randomUUID()}` };
  const { error } = await client.from('meetings').insert({ id: m.id, owner_id: user.id, title: m.title, starts_at: new Date(m.when).toISOString(), scheduled: m.scheduled, notes: m.notes });
  if (error) return { error: dbMessage(error.code) };
  return { data: m };
}
export async function cancelMeeting(id: string): Promise<Result<boolean>> {
  const { client } = await requireUser();
  if (!roomIdSchema.safeParse(id).success) return { error: 'Invalid meeting.' };
  const { data, error } = await client.rpc('cancel_own_meeting', { meeting_id: id });
  if (error) return { error: dbMessage(error.code) };
  if (!data) return { error: 'Meeting could not be cancelled. It may have started or already been cancelled.' };
  return { data: true };
}
export async function saveProfile(input: unknown): Promise<Result<boolean>> {
  const { client, user } = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await client.from('profiles').update(parsed.data).eq('id', user.id).select('id').single();
  if (error || !data) return { error: dbMessage(error?.code) };
  revalidatePath('/', 'layout');
  return { data: true };
}
