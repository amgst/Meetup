import { z } from 'zod';
export const meetingSchema = z.object({
  title: z.string().trim().min(1, 'Enter a meeting title.').max(80),
  when: z.number().finite(),
  scheduled: z.boolean(),
  notes: z.string().trim().max(180).default(''),
}).refine(m => !m.scheduled || m.when > Date.now(), { message: 'Choose a future date and time.', path: ['when'] });
export const roomIdSchema = z.string().regex(/^wbify-preview-[a-z0-9-]{8,64}$/i, 'Use a valid WBIFY Meet invitation.');
export function parseInvitation(raw: string): string {
  const input = raw.trim();
  if (roomIdSchema.safeParse(input).success) return input;
  const url = new URL(input);
  const room = url.hash.startsWith('#room=') ? decodeURIComponent(url.hash.slice(6)) : url.pathname.match(/^\/room\/([^/]+)\/?$/)?.[1];
  return roomIdSchema.parse(room);
}
