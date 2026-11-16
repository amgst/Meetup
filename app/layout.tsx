import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'WBIFY Meet — Meetings that feel effortless', description: 'Your workspace for important conversations.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
