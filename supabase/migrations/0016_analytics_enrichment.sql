-- Enrich analytics so we can learn who is using SoulFlow and where they come from.
-- Safe, additive changes only. Apply via Supabase SQL editor or `supabase db push`.

alter table public.page_visit_logs
  add column if not exists referrer text,
  add column if not exists device_type text,
  add column if not exists session_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

alter table public.event_analytics_logs
  add column if not exists session_id text,
  add column if not exists device_type text,
  add column if not exists referrer text;

create index if not exists page_visit_logs_session_id_idx
  on public.page_visit_logs (session_id);

create index if not exists page_visit_logs_utm_source_idx
  on public.page_visit_logs (utm_source);

create index if not exists event_analytics_logs_session_id_idx
  on public.event_analytics_logs (session_id);