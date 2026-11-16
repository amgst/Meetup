import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { roomIdSchema } from '@/lib/meetings/validation';
import { createClient } from '@/lib/supabase/server';
import { MeetingEntry } from '@/components/video/meeting-entry';
import { isLiveKitConfigured } from '@/lib/livekit/server';
import { GuestInvitation } from '@/components/meetings/guest-invitation';
export const metadata:Metadata={title:'Meeting invitation | WBIFY Meet',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Room({params}:{params:Promise<{roomId:string}>}){
  const {roomId}=await params;if(!roomIdSchema.safeParse(roomId).success)notFound();
  const client=await createClient();const {data:{user}}=await client.auth.getUser();
  const {data:meeting}=user?.email_confirmed_at?await client.from('meetings').select('id,title,status,starts_at,scheduled').eq('id',roomId).eq('owner_id',user.id).maybeSingle():{data:null};
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8"><Link href="/dashboard" className="brand mb-8"><span className="logo">&#10022;</span>WBIFY Meet</Link><h1 className="text-2xl font-extrabold">Your meeting workspace</h1>{meeting?<div className="mt-6"><h2 className="text-xl font-bold">{meeting.title}</h2>{meeting.status==='active'?<><p className="mt-3 text-slate-300">You are the meeting host.</p><MeetingEntry roomId={roomId} name={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Host'} isHost configured={isLiveKitConfigured()} /></>:<p className="mt-3 text-slate-300">This meeting is {meeting.status}.</p>}</div>:<GuestInvitation roomId={roomId} configured={isLiveKitConfigured()} />}<Link href="/dashboard" className="action secondary mt-6">Back to dashboard</Link></div></main>;
}
