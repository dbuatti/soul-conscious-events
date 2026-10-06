-- Record how relevant each imported event looks, so the review inbox can show
-- the plausible ones first instead of a flat list of everything a city-wide
-- listing happens to contain.
--
-- Nothing is dropped on this basis: the verdict is advisory, every row is still
-- stored and still pending, and the inbox reveals hidden rows behind a toggle.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS import_relevance TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_import_relevance_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_import_relevance_check
      CHECK (import_relevance IS NULL OR import_relevance IN ('on-topic', 'off-topic', 'unsure'));
  END IF;
END $$;

-- The inbox counts what is still waiting per source.
CREATE INDEX IF NOT EXISTS events_pending_by_relevance_idx
  ON public.events (import_relevance)
  WHERE approval_status = 'pending'
    AND is_deleted = false;

-- One-off: score the rows already imported, so the toggle has something to act
-- on immediately rather than only applying to future runs.
UPDATE public.events e
SET import_relevance = CASE
  WHEN lower(coalesce(e.event_name, '') || ' ' || coalesce(e.description, '')) ~
    '(sound bath|sound healing|meditat|mindful|breath ?work|yoga|pilates|kundalini|reiki|healing|chakra|aura|somatic|bodywork|bowen|vibrational|gong|singing bowl|crystal bowl|chant|kirtan|mantra|drum circle|shamanic|ritual|ceremony|sacred|feminine|embodied|tantra|ayurved|shiatsu|eurythmy|holistic|wellbeing|wellness|ecstatic dance)'
    THEN 'on-topic'
  WHEN lower(coalesce(e.event_name, '') || ' ' || coalesce(e.description, '')) ~
    '(\bgig\b|concert|\bband\b|\bdj\b|orchestra|choir|comedy|stand ?up|open ?mic|expo|exhibition|trade ?show|seminar|symposium|congress|convention|conference|masterclass|certification|webinar|lecture|fashion|runway|bazaar|rave|doof|psytrance|murder ?mystery)'
    THEN 'off-topic'
  ELSE 'unsure'
END
WHERE e.source_id IS NOT NULL
  AND e.approval_status = 'pending';