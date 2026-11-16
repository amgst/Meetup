import { MeetingActions } from '@/components/meetings/meeting-actions';
import { MeetingList } from '@/components/meetings/meeting-list';
export default function Meetings() { return <><p className="eyebrow">YOUR WORKSPACE</p><h1 className="heading">My meetings</h1><p className="muted">Manage invitations and meetings saved to your account.</p><div className="sectionHeading"><h3>All meetings</h3><MeetingActions hero /></div><MeetingList /></>; }
