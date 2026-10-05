-- Harden profiles against privilege escalation.
--
-- The original profiles_update_policy was
--   USING (auth.uid() = id OR role = 'admin')
-- with no WITH CHECK. Two problems:
--   1. Any user can UPDATE their own row and set role = 'admin'.
--   2. `role = 'admin'` tests the *target row's* role, so any authenticated
--      user can edit any admin's profile row.
-- This migration adds an is_admin() helper, rewrites the policies to use it,
-- and adds a trigger so role can only be changed by an admin or the service
-- role, whatever other policies exist on the live database.

-- SECURITY DEFINER so it can read profiles without recursing through RLS.
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

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (public.is_admin());

-- New rows created by users themselves must start as plain users.
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND coalesce(role, 'user') = 'user');

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only restrict end-user requests; the service role and direct SQL (dashboard,
  -- migrations) carry no anon/authenticated JWT and are left alone.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change a user''s role'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();
