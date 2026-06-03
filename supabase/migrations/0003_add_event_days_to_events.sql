-- end_date may already exist on the live table; this is a no-op if so
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date DATE;

-- Per-day schedule data: array of { date, start_time, end_time, notes? }
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_days JSONB;
