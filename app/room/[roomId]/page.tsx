import Link from 'next/link';
import { notFound } from 'next/navigation';
import { roomIdSchema } from '@/lib/meetings/validation';
export default async function Room({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  if (!roomIdSchema.safeParse(roomId).success) notFound();
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8"><Link href="/dashboard" className="brand mb-8"><span className="logo">✦</span>WBIFY Meet</Link><h1 className="text-2xl font-extrabold">Your meeting workspace</h1><p className="mt-4 leading-7 text-slate-300">Live video is planned for Phase 4. This page confirms the invitation format; it does not verify a meeting exists or grant admission.</p><p className="my-6 break-all rounded-lg bg-slate-800 p-4 font-mono text-sm">{roomId}</p><Link href="/dashboard" className="action">Back to dashboard</Link></div></main>;
}
