-- Seed the first batch of self-driving sources, so the importer discovers events
-- on its own instead of relying on someone pasting individual event links.
--
-- City-wide category listings rather than single events: each returns ~50 event
-- URLs in one fetch, which the importer then fans out into detail pages across
-- successive daily runs. The relevance filter decides what survives, so a broad
-- listing is safe to point at -- most of it will be rejected as off-topic.
--
-- Verified live: every URL below returns 200 with event links present.
-- Idempotent: url is UNIQUE, so re-running will not duplicate or clobber rows,
-- and any source an admin later deletes stays deleted.

INSERT INTO public.event_sources (url, label) VALUES
  ('https://www.eventbrite.com.au/d/australia--melbourne/wellness/', 'Eventbrite - Melbourne wellness'),
  ('https://www.eventbrite.com.au/d/australia--sydney/wellness/',    'Eventbrite - Sydney wellness'),
  ('https://www.eventbrite.com.au/d/australia--brisbane/wellness/',  'Eventbrite - Brisbane wellness'),
  ('https://www.eventbrite.com.au/d/australia--perth/wellness/',     'Eventbrite - Perth wellness'),
  ('https://www.eventbrite.com.au/d/australia--adelaide/wellness/',  'Eventbrite - Adelaide wellness'),
  ('https://events.humanitix.com/host/evoke-sounds',                 'Humanitix - Evoke Sounds')
ON CONFLICT (url) DO NOTHING;
