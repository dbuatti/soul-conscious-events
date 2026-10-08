-- Turn ig_slide_batches into a lightweight publish ledger so the admin panel can
-- track what has been posted, what is scheduled, and what failed.
--
--   status: 'draft' (generated, not posted) | 'scheduled' | 'posted' | 'failed'
--
-- When a carousel is regenerated the edge functions upsert on (kind, week_start)
-- and deliberately omit these columns, so the publishing state survives a
-- rebuild.
alter table public.ig_slide_batches
  add column if not exists title text,
  add column if not exists status text not null default 'draft',
  add column if not exists scheduled_for timestamp with time zone,
  add column if not exists posted_at timestamp with time zone,
  add column if not exists instagram_media_id text,
  add column if not exists error text;