-- Store coordinates on the event instead of geocoding in the browser.
--
-- The map had nowhere to put a location, so it geocoded every event's address
-- from the client on every visit: one request per event, serially, with a 1.1s
-- sleep in front of each one to respect Nominatim's usage policy. Seventy
-- uncached events is well over a minute of waiting, and filtering by state only
-- helps once localStorage happens to be warm.
--
-- The importer writes full_address; this gives somewhere to put the result. The
-- geocode-events edge function fills these in once, and the map reads them
-- directly afterwards.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Bounded to Australia so a bad geocode can't drop a marker in the ocean or, for
-- a New Zealand result, on the other side of the planet.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_coordinates_in_australia_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_coordinates_in_australia_check
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -44.5 AND -10 AND longitude BETWEEN 112 AND 154)
  );

-- The map fetches upcoming, undeleted events with coordinates present. A partial
-- index keeps that scan proportional to the handful of plotted events rather
-- than to every event ever imported.
CREATE INDEX IF NOT EXISTS events_mappable_idx
  ON public.events (event_date)
  WHERE latitude IS NOT NULL
    AND is_deleted = false
    AND approval_status = 'approved';