-- Add a `kind` axis to slide batches: 'weekly' (event carousel) or 'brand'
-- (evergreen welcome/intro carousel). Uniqueness moves from week_start alone to
-- (kind, week_start) so a brand rebuild on the same day replaces that day's set
-- without clashing with the weekly carousel.
alter table public.ig_slide_batches
  add column if not exists kind text not null default 'weekly';

alter table public.ig_slide_batches
  drop constraint if exists ig_slide_batches_week_start_key;

alter table public.ig_slide_batches
  add constraint ig_slide_batches_kind_week_start_key unique (kind, week_start);