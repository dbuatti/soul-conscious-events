-- Optional cutoff date for recurring events; NULL means ~3-month rolling window
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
