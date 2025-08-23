export interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  location?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  approval_status?: string; // Renamed from 'state'
  geographical_state?: string; // New field for Australian state
  image_url?: string;
  user_id?: string;
  is_deleted?: boolean;
  discount_code?: string;
}