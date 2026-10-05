-- Stop events landing in a state that's invisible everywhere.
--
-- approval_status had no default and no NOT NULL, so anything inserted without
-- it landed as NULL: not 'approved' means the public SELECT policy hides it, and
-- not 'pending' means the admin inbox never lists it. Three rows were in exactly
-- that hole. Same story for is_deleted, which the inbox also filters on.
--
-- Backfill first, then tighten. Safe to re-run.

UPDATE public.events
SET approval_status = 'pending'
WHERE approval_status IS NULL
   OR approval_status NOT IN ('pending', 'approved', 'rejected');

ALTER TABLE public.events
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

-- Catches a typo'd status at the point of the write rather than in a filtered-out
-- row somebody notices weeks later. Every writer in the app uses one of these
-- three: SubmitEvent and EventEditPage write 'approved', the review inbox writes
-- 'approved'/'rejected', the importer writes 'pending'.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_approval_status_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

UPDATE public.events SET is_deleted = false WHERE is_deleted IS NULL;

ALTER TABLE public.events
  ALTER COLUMN is_deleted SET DEFAULT false,
  ALTER COLUMN is_deleted SET NOT NULL;