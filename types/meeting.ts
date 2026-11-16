export type Meeting = {
  id: string;
  title: string;
  when: number;
  scheduled: boolean;
  notes: string;
  status: 'active' | 'cancelled' | 'ended';
};
export type MeetingInput = Omit<Meeting, 'id' | 'status'>;
export type Invitation = { id: string; expires_at: string; revoked_at: string | null; created_at: string };
export type GuestMeeting = { id: string; title: string; starts_at: string; scheduled: boolean; expires_at: string };
