import { z } from 'zod';
export const emailSchema = z.email('Enter a valid email address.').max(254);
export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(128, 'Use no more than 128 characters.');
export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Enter your name.').max(80),
  timezone: z.string().min(1).max(100).refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }, 'Enter a valid timezone, such as Asia/Karachi.'),
});
// Explicit allowlist prevents protocol-relative URLs, encoded redirects and CRLF.
export function authDestination(value: string | null) { return value === '/reset-password' ? value : '/dashboard'; }
