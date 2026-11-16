import { z } from 'zod';
export const meetingSchema = z.object({
  title: z.string().trim().min(1, 'Enter a meeting title.').max(80),
  when: z.number().finite().min(0).max(8640000000000000),
  scheduled: z.boolean(),
  notes: z.string().trim().max(180).default(''),
}).refine(m => !m.scheduled || m.when > Date.now(), { message: 'Choose a future date and time.', path: ['when'] });
export const roomIdSchema = z.string().regex(/^wbify-preview-[a-z0-9-]{8,64}$/i, 'Use a valid WBIFY Meet invitation.');
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export function parseInvitation(raw: string): string {
  const input = raw.trim();
  if (roomIdSchema.safeParse(input).success) return input;
  const url = new URL(input);
  const room = url.hash.startsWith('#room=') ? decodeURIComponent(url.hash.slice(6)) : url.pathname.match(/^\/room\/([^/]+)\/?$/)?.[1];
  return roomIdSchema.parse(room);
}
export function invitationPath(raw: string) {
  const id = parseInvitation(raw);
  if (roomIdSchema.safeParse(raw.trim()).success) return `/room/${id}`;
  const url = new URL(raw.trim());
  const token = new URLSearchParams(url.hash.slice(1)).get('invite');
  if (!token) return `/room/${id}`;
  return `/room/${id}#invite=${invitationTokenSchema.parse(token)}`;
}
