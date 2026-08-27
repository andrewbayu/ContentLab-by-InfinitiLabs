-- ContentLab Auth/RLS cutover (phase 2)
--
-- Apply this migration only after every row in team_members has a matching
-- auth_user_id from auth.users. The preflight below intentionally aborts
-- instead of enabling RLS and locking out unmapped users.

DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM public.team_members
  WHERE auth_user_id IS NULL;

  IF unmapped_count > 0 THEN
    RAISE EXCEPTION
      'ContentLab Auth/RLS cutover blocked: % team_members row(s) are missing auth_user_id. Provision Auth users and map them first.',
      unmapped_count;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.can_access_task(
  target_client TEXT,
  target_brand TEXT,
  target_owner_id UUID,
  target_reviewer_id UUID,
  target_collaborator_ids JSONB,
  target_creator_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT private.can_access_client(target_client, target_brand)
    OR private.current_member_id() IN (target_owner_id, target_reviewer_id, target_creator_id)
    OR COALESCE(target_collaborator_ids, '[]'::jsonb) ? private.current_member_id()::TEXT;
$$;

REVOKE ALL ON FUNCTION private.can_access_task(TEXT, TEXT, UUID, UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access_task(TEXT, TEXT, UUID, UUID, JSONB, UUID) TO authenticated;

-- Client users may approve or request revisions, but cannot mutate the rest
-- of a task row through a direct REST update. The trigger protects this even
-- if a client crafts a request that satisfies the row policy.
CREATE OR REPLACE FUNCTION private.guard_client_task_update()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, private, pg_catalog
AS $$
BEGIN
  IF private.current_member_role() = 'client' THEN
    IF NEW.status NOT IN ('Review/Editing', 'Scheduled') THEN
      RAISE EXCEPTION 'Client review can only set Review/Editing or Scheduled.';
    END IF;

    IF (to_jsonb(NEW) - ARRAY['status', 'updated_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
      RAISE EXCEPTION 'Client review cannot modify task fields other than status.';
    END IF;

    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_client_task_update ON public.tasks;
CREATE TRIGGER guard_client_task_update
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_client_task_update();

-- Enable RLS on every exposed ContentLab table.
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Remove the previous anonymous catch-all grants/policies.
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.channels FROM anon;
REVOKE ALL ON public.client_brands FROM anon;
REVOKE ALL ON public.tasks FROM anon;
REVOKE ALL ON public.comments FROM anon;
REVOKE ALL ON public.kpi_definitions FROM anon;
REVOKE ALL ON public.kpi_updates FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.task_resources FROM anon;
REVOKE ALL ON public.notifications FROM anon;

-- Never expose the legacy password column through the Data API. Column-level
-- grants replace the broad table SELECT grant for this table.
REVOKE ALL ON public.team_members FROM authenticated;
GRANT SELECT (id, name, email, role, client_access, avatar_url, auth_user_id, created_at)
  ON public.team_members TO authenticated;
GRANT INSERT (name, email, role, client_access, avatar_url, auth_user_id)
  ON public.team_members TO authenticated;
GRANT UPDATE (name, email, role, client_access, avatar_url, auth_user_id)
  ON public.team_members TO authenticated;
GRANT DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_brands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- TEAM MEMBERS ----------------------------------------------------------
DROP POLICY IF EXISTS "team members select" ON public.team_members;
CREATE POLICY "team members select"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    private.is_super_user()
    OR id = private.current_member_id()
    OR (private.current_member_role() IN ('team', 'client') AND role IN ('super', 'team'))
  );

DROP POLICY IF EXISTS "team members insert" ON public.team_members;
CREATE POLICY "team members insert"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (private.is_super_user());

DROP POLICY IF EXISTS "team members update" ON public.team_members;
CREATE POLICY "team members update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (private.is_super_user())
  WITH CHECK (private.is_super_user());

DROP POLICY IF EXISTS "team members delete" ON public.team_members;
CREATE POLICY "team members delete"
  ON public.team_members FOR DELETE TO authenticated
  USING (private.is_super_user());

-- CHANNELS --------------------------------------------------------------
DROP POLICY IF EXISTS "channels select" ON public.channels;
CREATE POLICY "channels select"
  ON public.channels FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "channels write" ON public.channels;
CREATE POLICY "channels write"
  ON public.channels FOR ALL TO authenticated
  USING (private.is_super_user())
  WITH CHECK (private.is_super_user());

-- CLIENT / BRAND REGISTRY ----------------------------------------------
DROP POLICY IF EXISTS "client brands select" ON public.client_brands;
CREATE POLICY "client brands select"
  ON public.client_brands FOR SELECT TO authenticated
  USING (private.can_access_client(client, brand));

DROP POLICY IF EXISTS "client brands write" ON public.client_brands;
CREATE POLICY "client brands write"
  ON public.client_brands FOR ALL TO authenticated
  USING (private.is_super_user())
  WITH CHECK (private.is_super_user());

-- TASKS -----------------------------------------------------------------
DROP POLICY IF EXISTS "tasks select" ON public.tasks;
CREATE POLICY "tasks select"
  ON public.tasks FOR SELECT TO authenticated
  USING (private.can_access_task(client, brand, owner_id, reviewer_id, collaborator_ids, creator_id));

DROP POLICY IF EXISTS "tasks insert" ON public.tasks;
CREATE POLICY "tasks insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    private.is_internal_user()
    AND private.can_access_client(client, brand)
  );

DROP POLICY IF EXISTS "tasks update" ON public.tasks;
CREATE POLICY "tasks update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    (
      private.is_internal_user()
      AND private.can_access_task(client, brand, owner_id, reviewer_id, collaborator_ids, creator_id)
    )
    OR (
      private.current_member_role() = 'client'
      AND private.can_access_client(client, brand)
    )
  )
  WITH CHECK (
    (
      private.is_internal_user()
      AND private.can_access_client(client, brand)
    )
    OR (
      private.current_member_role() = 'client'
      AND private.can_access_client(client, brand)
      AND status IN ('Review/Editing', 'Scheduled')
    )
  );

DROP POLICY IF EXISTS "tasks delete" ON public.tasks;
CREATE POLICY "tasks delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    private.is_internal_user()
    AND private.can_access_task(client, brand, owner_id, reviewer_id, collaborator_ids, creator_id)
  );

-- COMMENTS --------------------------------------------------------------
DROP POLICY IF EXISTS "comments select" ON public.comments;
CREATE POLICY "comments select"
  ON public.comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks AS task
      WHERE task.id = comments.task_id
        AND private.can_access_task(task.client, task.brand, task.owner_id, task.reviewer_id, task.collaborator_ids, task.creator_id)
    )
  );

DROP POLICY IF EXISTS "comments insert" ON public.comments;
CREATE POLICY "comments insert"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = private.current_member_id()
    AND EXISTS (
      SELECT 1
      FROM public.tasks AS task
      WHERE task.id = comments.task_id
        AND private.can_access_task(task.client, task.brand, task.owner_id, task.reviewer_id, task.collaborator_ids, task.creator_id)
    )
  );

DROP POLICY IF EXISTS "comments update" ON public.comments;
CREATE POLICY "comments update"
  ON public.comments FOR UPDATE TO authenticated
  USING (private.is_super_user() OR author_id = private.current_member_id())
  WITH CHECK (private.is_super_user() OR author_id = private.current_member_id());

DROP POLICY IF EXISTS "comments delete" ON public.comments;
CREATE POLICY "comments delete"
  ON public.comments FOR DELETE TO authenticated
  USING (private.is_super_user() OR author_id = private.current_member_id());

-- KPI DEFINITIONS -------------------------------------------------------
DROP POLICY IF EXISTS "kpi definitions select" ON public.kpi_definitions;
CREATE POLICY "kpi definitions select"
  ON public.kpi_definitions FOR SELECT TO authenticated
  USING (private.can_access_client(client, brand));

DROP POLICY IF EXISTS "kpi definitions write" ON public.kpi_definitions;
CREATE POLICY "kpi definitions write"
  ON public.kpi_definitions FOR ALL TO authenticated
  USING (private.is_super_user())
  WITH CHECK (private.is_super_user());

-- KPI UPDATES -----------------------------------------------------------
DROP POLICY IF EXISTS "kpi updates select" ON public.kpi_updates;
CREATE POLICY "kpi updates select"
  ON public.kpi_updates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.kpi_definitions AS definition
      WHERE definition.id = kpi_updates.kpi_id
        AND private.can_access_client(definition.client, definition.brand)
    )
  );

DROP POLICY IF EXISTS "kpi updates write" ON public.kpi_updates;
CREATE POLICY "kpi updates write"
  ON public.kpi_updates FOR ALL TO authenticated
  USING (
    private.is_internal_user()
    AND EXISTS (
      SELECT 1
      FROM public.kpi_definitions AS definition
      WHERE definition.id = kpi_updates.kpi_id
        AND private.can_access_client(definition.client, definition.brand)
    )
  )
  WITH CHECK (
    private.is_internal_user()
    AND EXISTS (
      SELECT 1
      FROM public.kpi_definitions AS definition
      WHERE definition.id = kpi_updates.kpi_id
        AND private.can_access_client(definition.client, definition.brand)
    )
  );

-- DOCUMENTS -------------------------------------------------------------
DROP POLICY IF EXISTS "documents select" ON public.documents;
CREATE POLICY "documents select"
  ON public.documents FOR SELECT TO authenticated
  USING (
    private.is_super_user()
    OR (
      private.is_internal_user()
      AND (
        (visibility = 'personal' AND owner_id = private.current_member_id())
        OR (visibility IN ('team', 'client') AND private.can_access_client(client, brand))
      )
    )
    OR (
      private.current_member_role() = 'client'
      AND visibility = 'client'
      AND private.can_access_client(client, brand)
    )
  );

DROP POLICY IF EXISTS "documents insert" ON public.documents;
CREATE POLICY "documents insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    private.is_internal_user()
    AND (private.is_super_user() OR owner_id = private.current_member_id())
    AND (
      visibility = 'personal'
      OR private.can_access_client(client, brand)
    )
  );

DROP POLICY IF EXISTS "documents update" ON public.documents;
CREATE POLICY "documents update"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    private.is_super_user()
    OR (private.is_internal_user() AND owner_id = private.current_member_id())
  )
  WITH CHECK (
    private.is_super_user()
    OR (private.is_internal_user() AND owner_id = private.current_member_id())
    AND (
      visibility = 'personal'
      OR private.can_access_client(client, brand)
    )
  );

DROP POLICY IF EXISTS "documents delete" ON public.documents;
CREATE POLICY "documents delete"
  ON public.documents FOR DELETE TO authenticated
  USING (
    private.is_super_user()
    OR (private.is_internal_user() AND owner_id = private.current_member_id())
  );

-- TASK RESOURCES --------------------------------------------------------
-- Remove the legacy catch-all policy created by the initial task resources
-- migration. Leaving it in place would OR with the scoped policies below.
DROP POLICY IF EXISTS "task resources app access" ON public.task_resources;
DROP POLICY IF EXISTS "task resources select" ON public.task_resources;
CREATE POLICY "task resources select"
  ON public.task_resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks AS task
      WHERE task.id = task_resources.task_id
        AND private.can_access_task(task.client, task.brand, task.owner_id, task.reviewer_id, task.collaborator_ids, task.creator_id)
        AND (
          private.is_internal_user()
          OR task_resources.visibility = 'client'
        )
    )
  );

DROP POLICY IF EXISTS "task resources insert" ON public.task_resources;
CREATE POLICY "task resources insert"
  ON public.task_resources FOR INSERT TO authenticated
  WITH CHECK (
    private.is_internal_user()
    AND created_by = private.current_member_id()
    AND EXISTS (
      SELECT 1
      FROM public.tasks AS task
      WHERE task.id = task_resources.task_id
        AND private.can_access_task(task.client, task.brand, task.owner_id, task.reviewer_id, task.collaborator_ids, task.creator_id)
    )
  );

DROP POLICY IF EXISTS "task resources update" ON public.task_resources;
CREATE POLICY "task resources update"
  ON public.task_resources FOR UPDATE TO authenticated
  USING (private.is_super_user() OR created_by = private.current_member_id())
  WITH CHECK (private.is_super_user() OR created_by = private.current_member_id());

DROP POLICY IF EXISTS "task resources delete" ON public.task_resources;
CREATE POLICY "task resources delete"
  ON public.task_resources FOR DELETE TO authenticated
  USING (private.is_super_user() OR created_by = private.current_member_id());

-- NOTIFICATIONS ---------------------------------------------------------
DROP POLICY IF EXISTS "ContentLab notifications app access" ON public.notifications;
DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = private.current_member_id());

DROP POLICY IF EXISTS "notifications insert actor" ON public.notifications;
CREATE POLICY "notifications insert actor"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = private.current_member_id()
    AND (
      task_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.tasks AS task
        WHERE task.id = notifications.task_id
          AND private.can_access_task(task.client, task.brand, task.owner_id, task.reviewer_id, task.collaborator_ids, task.creator_id)
      )
    )
  );

DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = private.current_member_id())
  WITH CHECK (user_id = private.current_member_id());

DROP POLICY IF EXISTS "notifications delete own" ON public.notifications;
CREATE POLICY "notifications delete own"
  ON public.notifications FOR DELETE TO authenticated
  USING (private.is_super_user() OR user_id = private.current_member_id());
