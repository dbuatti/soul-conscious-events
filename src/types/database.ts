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

export interface EventSource {
  id: string;
  url: string;
  label: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_status: 'ok' | 'partial' | 'error' | null;
  last_message: string | null;
  last_found: number | null;
  last_added: number | null;
  created_at: string;
}

export interface EventImportRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  triggered_by: string;
  sources_checked: number;
  events_found: number;
  events_added: number;
}

export interface SlideBatchSlide {
  path: string;
  publicUrl: string;
}

export type SlidePostStatus = 'draft' | 'scheduled' | 'posted' | 'failed';

export interface SlideBatch {
  id: string;
  kind: string;
  title: string | null;
  week_start: string;
  caption: string;
  slides: SlideBatchSlide[];
  event_count: number;
  collaborators: string | null;
  status: SlidePostStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  instagram_media_id: string | null;
  error: string | null;
  created_at: string;
}

export interface IgAccountInsights {
  username: string | null;
  followers_count: number | null;
  media_count: number | null;
  reach: number | null;
}

export interface IgMediaInsights {
  id: string;
  media_type: string | null;
  permalink: string | null;
  timestamp: string | null;
  like_count: number | null;
  comments_count: number | null;
  insights: { reach: number | null; saved: number | null; shares: number | null; views: number | null } | null;
  insightsError?: string;
}

export interface IgInsightsResponse {
  ok?: boolean;
  account?: IgAccountInsights;
  media?: IgMediaInsights[];
  error?: string;
  code?: string;
}
