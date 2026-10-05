// Row shapes for Supabase tables used outside the Event type.

export interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  username?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  role?: 'user' | 'admin' | null;
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  full_address?: string | null;
  phone?: string | null;
  website?: string | null;
  hours?: string | null;
  highlights?: string | null;
  created_at?: string;
}

export interface EventAnalyticsLog {
  event_id: string;
  log_type: 'view' | 'ticket_click' | string;
  logged_at: string;
  events?: { event_name?: string | null } | null;
}

export interface DiscountCodeUsageLog {
  event_id: string;
  copied_at?: string;
}

export interface PageVisitLog {
  page_path?: string | null;
  action_type?: string | null;
  logged_at?: string;
}
