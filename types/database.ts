// Application-used subset of the Phase 2 schema. Regenerate via Supabase CLI
// when production schema access is available; future media tables are unused.
type Timestamps = { created_at: string; updated_at: string };
type Profile = Timestamps & { id: string; display_name: string; timezone: string };
type MeetingRow = Timestamps & { id: string; owner_id: string; title: string; starts_at: string; scheduled: boolean; notes: string; status: 'active' | 'cancelled' | 'ended'; locked: boolean };
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: { id: string; display_name?: string; timezone?: string }; Update: Partial<Pick<Profile,'display_name' | 'timezone'>>; Relationships: [] };
      meetings: { Row: MeetingRow; Insert: Pick<MeetingRow,'id' | 'owner_id' | 'title' | 'starts_at'> & Partial<Pick<MeetingRow,'scheduled' | 'notes'>>; Update: never; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      set_meeting_presenter:{Args:{p_meeting_id:string;p_identity:string;p_enabled:boolean};Returns:boolean};
      meeting_presenter_access:{Args:{p_meeting_id:string;p_identity:string;p_token:string};Returns:boolean};
      record_livekit_event: { Args: { p_id:string; p_kind:string; p_room_id:string; p_room_sid:string; p_identity:string; p_name:string; p_when:string }; Returns:boolean };
      cancel_own_meeting: { Args: { meeting_id: string }; Returns: boolean };
      edit_own_meeting: { Args: { p_meeting_id: string; p_title: string; p_notes: string; p_starts_at: string }; Returns: boolean };
      issue_meeting_invitation: { Args: { p_meeting_id: string; p_token_hash: string; p_expires_at: string }; Returns: string };
      list_own_invitations: { Args: { p_meeting_id: string }; Returns: import('./meeting').Invitation[] };
      revoke_own_invitation: { Args: { p_invitation_id: string }; Returns: boolean };
      validate_meeting_invitation: { Args: { p_meeting_id: string; p_token: string }; Returns: import('./meeting').GuestMeeting[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
