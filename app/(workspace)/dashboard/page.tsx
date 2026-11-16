import Link from 'next/link';
import { MeetingActions } from '@/components/meetings/meeting-actions';
import { MeetingList } from '@/components/meetings/meeting-list';
import { requireUser } from '@/lib/auth/user';
export default async function Dashboard() {
  const { client, user } = await requireUser();
  const { data } = await client.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
  return <><p className="eyebrow">YOUR VIRTUAL WORKSPACE</p><h1 className="heading">Good to see you{data?.display_name ? `, ${data.display_name}` : ''}</h1><p className="muted">One simple place for every important conversation.</p><div className="hero"><div className="herotext"><span className="text-xs font-extrabold tracking-widest text-indigo-300">CONNECT. COLLABORATE. CREATE.</span><h2>Bring everyone together,<br />from anywhere.</h2><p>Start a conversation in seconds. Share one link and keep your team connected, wherever work happens.</p><MeetingActions hero /></div><div className="heroVisual" aria-hidden><div className="mockCall"><div className="mockPerson" /><div className="callBar">●　♫　▣　☷　☎</div></div></div></div><div className="sectionHeading"><h3>What would you like to do?</h3></div><MeetingActions /><div className="sectionHeading"><h3>Upcoming meetings</h3><Link href="/meetings" className="join">View all</Link></div><MeetingList mode="upcoming" limit={3} /><div className="sectionHeading"><h3>Recent meetings</h3></div><MeetingList mode="previous" limit={3} /></>;
}
