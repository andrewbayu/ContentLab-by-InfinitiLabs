-- ContentLab Auth foundation (phase 1)
--
-- This migration is intentionally non-locking: it adds the mapping needed to
-- move from the legacy team_members password check to Supabase Auth, but does
-- not enable RLS yet. RLS is enabled by the follow-up policy migration after
-- every active user has an auth.users account mapped below.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_auth_user_id
  ON public.team_members (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.team_members.auth_user_id IS
  'Supabase Auth user id. Required before the Auth/RLS cutover.';

-- Keep authorization helpers outside the exposed public schema. They are
-- SECURITY DEFINER only to read the member mapping while team_members itself
-- is protected by RLS in the next phase. The fixed search_path prevents object
-- shadowing attacks.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_member_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT tm.id
  FROM public.team_members AS tm
  WHERE tm.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_member_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT tm.role
  FROM public.team_members AS tm
  WHERE tm.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_client_access()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(tm.client_access, '')
  FROM public.team_members AS tm
  WHERE tm.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_internal_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((SELECT private.current_member_role()) IN ('super', 'team'), FALSE);
$$;

CREATE OR REPLACE FUNCTION private.is_super_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((SELECT private.current_member_role()) = 'super', FALSE);
$$;

CREATE OR REPLACE FUNCTION private.can_access_client(target_client TEXT, target_brand TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN tm.role = 'super' THEN TRUE
      WHEN tm.role = 'client' THEN
        NULLIF(BTRIM(COALESCE(target_client, '')), '') IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(LOWER(COALESCE(tm.client_access, '')), '\s*,\s*')) AS access_name
          WHERE access_name IN (LOWER(BTRIM(target_client)), LOWER(BTRIM(target_brand)))
             OR access_name IN ('*', 'all', 'all clients')
        )
      ELSE
        NULLIF(BTRIM(COALESCE(tm.client_access, '')), '') IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(LOWER(COALESCE(tm.client_access, '')), '\s*,\s*')) AS access_name
          WHERE access_name IN (LOWER(BTRIM(target_client)), LOWER(BTRIM(target_brand)))
             OR access_name IN ('*', 'all', 'all clients')
        )
    END
    FROM public.team_members AS tm
    WHERE tm.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  ), FALSE);
$$;

REVOKE ALL ON FUNCTION private.current_member_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_member_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_client_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_internal_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_client(TEXT, TEXT) FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_member_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_client_access() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_internal_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_client(TEXT, TEXT) TO authenticated;
