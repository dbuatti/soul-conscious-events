-- Record each generated weekly Instagram carousel so the admin panel can show
-- it and hand over the caption.
--
-- The slide images themselves live in the public ig-weekly-slides bucket --
-- Instagram fetches images from publicly reachable URLs, so they must be public.
-- This row carries the ordered list and the caption, so the panel does not have
-- to reconstruct either from bucket contents.
--
-- Read-only to admins: the weekly function writes with the service-role key,
-- which bypasses RLS, so no INSERT policy is needed and none is granted.

CREATE TABLE IF NOT EXISTS public.ig_slide_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  caption TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ig_slide_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_slide_batches_admin_read" ON public.ig_slide_batches;
CREATE POLICY "ig_slide_batches_admin_read" ON public.ig_slide_batches
FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS ig_slide_batches_week_idx
  ON public.ig_slide_batches (week_start DESC);
