-- Remember geocoding attempts that found nothing, so the backfill can finish.
--
-- A miss leaves latitude NULL, which is indistinguishable from "not tried yet",
-- so every rerun re-attempted the same hopeless addresses first and the run
-- never converged. Recording the attempt separates the two.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geocode_failed_at timestamptz;

-- The map only ever plots upcoming, approved, undeleted events, so that is all
-- this function needs to work through.
CREATE INDEX IF NOT EXISTS events_geocode_todo_idx
  ON public.events (event_date)
  WHERE latitude IS NULL
    AND geocode_failed_at IS NULL
    AND is_deleted = false
    AND approval_status = 'approved';
