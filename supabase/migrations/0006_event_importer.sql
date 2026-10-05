-- Event importer: sources to watch, a run log, and provenance on events.
-- Imported events are inserted with approval_status = 'pending' and wait in
-- the admin panel's Imports inbox for review.

-- Same definition as 0005; repeated so this migration also works on its own.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid
      AND (p.role = 'admin' OR p.email = 'daniele.buatti@gmail.com')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_status TEXT CHECK (last_status IN ('ok', 'partial', 'error')),
  last_message TEXT,
  last_found INTEGER,
  last_added INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_sources_admin_all" ON public.event_sources;
CREATE POLICY "event_sources_admin_all" ON public.event_sources
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.event_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  triggered_by TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'schedule'
  sources_checked INTEGER NOT NULL DEFAULT 0,
  events_found INTEGER NOT NULL DEFAULT 0,
  events_added INTEGER NOT NULL DEFAULT 0,
  details JSONB
);

ALTER TABLE public.event_import_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_import_runs_admin_read" ON public.event_import_runs;
CREATE POLICY "event_import_runs_admin_read" ON public.event_import_runs
FOR SELECT TO authenticated
USING (public.is_admin());

-- Provenance on imported events. external_id is the source's own identifier
-- (iCal UID or normalised event URL) and is what prevents re-importing.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.event_sources(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS events_external_id_idx ON public.events (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_pending_idx ON public.events (approval_status) WHERE approval_status = 'pending';
