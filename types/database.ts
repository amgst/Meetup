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
    Functions: { cancel_own_meeting: { Args: { meeting_id: string }; Returns: boolean } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
