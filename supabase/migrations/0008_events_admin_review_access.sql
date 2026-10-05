-- Let admins read and moderate events that aren't published yet.
--
-- The events table predates this migrations folder, so its policies were written
-- by hand before public.is_admin() existed. They only cover "published events
-- are public" and "you can see your own rows". Nothing grants an admin a way to
-- read approval_status = 'pending', so the importer (service role, RLS-exempt)
-- has been filling the review inbox with rows that the review inbox could never
-- read back — imports reported "N new events waiting for your review" while the
-- inbox showed 0 waiting.
--
-- This adds the missing admin policy. Public and per-user policies are
-- unaffected: policies are OR'd together, so approved events stay visible to
-- everyone and users can still only write their own rows.

-- NOTE: uses public.is_admin() rather than the older
--   (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
-- subquery, so the admin email keeps working regardless of the profile's role.
DROP POLICY IF EXISTS "events_admin_all" ON public.events;
CREATE POLICY "events_admin_all" ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());