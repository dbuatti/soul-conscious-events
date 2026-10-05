-- Lock down reads of profiles (which hold email addresses).
--
-- The live database had a legacy policy "Public profiles are viewable by
-- everyone." (SELECT USING true), which let anyone, even logged-out visitors,
-- list every user's email via the public API. Policies are OR'ed, so it
-- overrode the stricter profiles_select_policy.
--
-- After this: users read their own row; admins read all. The app only ever
-- reads other users' profiles from the admin panel. Requires is_admin() from
-- migration 0005.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Older duplicates of the insert/update policies replaced in 0005. The update
-- one had no WITH CHECK; 0005's trigger already blocks role changes, but these
-- are redundant and are removed so the policy list is easy to reason about.
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
