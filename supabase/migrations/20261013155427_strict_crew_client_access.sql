-- Strict client boundaries for ContentLab crew assignments.
CREATE OR REPLACE FUNCTION private.can_access_client(target_client TEXT, target_brand TEXT DEFAULT '')
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
 SELECT COALESCE((
   SELECT CASE
     WHEN tm.role = 'super' THEN TRUE
     WHEN tm.role = 'team' AND lower(btrim(coalesce(tm.client_access,''))) IN ('','all','all clients','*') THEN TRUE
     ELSE EXISTS (
       SELECT 1 FROM unnest(string_to_array(coalesce(tm.client_access,''), ',')) AS entry
       WHERE lower(btrim(entry)) = lower(btrim(coalesce(target_client,'')))
         AND nullif(btrim(coalesce(target_client,'')), '') IS NOT NULL
         AND btrim(entry) <> '__none__'
     )
   END FROM public.team_members tm
   WHERE tm.auth_user_id = (SELECT auth.uid()) LIMIT 1
 ), FALSE);
$$;
CREATE OR REPLACE FUNCTION private.can_access_task(
 target_client TEXT, target_brand TEXT, target_owner_id UUID,
 target_reviewer_id UUID, target_collaborator_ids JSONB, target_creator_id UUID
)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$ SELECT private.can_access_client(target_client, target_brand); $$;
REVOKE ALL ON FUNCTION private.can_access_client(TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_task(TEXT,TEXT,UUID,UUID,JSONB,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access_client(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_task(TEXT,TEXT,UUID,UUID,JSONB,UUID) TO authenticated;
