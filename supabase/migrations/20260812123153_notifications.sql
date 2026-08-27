-- ====================================================================
-- Notifications Table — in-app notification system for @mentions in comments
-- Must run after the initial schema because it references team_members,
-- comments, and tasks.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  actor_name TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'mention' CHECK (type IN ('mention', 'comment', 'assignment')),
  title TEXT NOT NULL DEFAULT '',
  body TEXT DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Explicit Data API grants are separate from RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ContentLab currently authenticates through team_members rather than
-- Supabase Auth. Keep this compatible with the existing app model; the app
-- filters notification reads by the logged-in team member ID.
DROP POLICY IF EXISTS "ContentLab notifications app access" ON public.notifications;
CREATE POLICY "ContentLab notifications app access"
  ON public.notifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Realtime idempotently so this migration can be re-run safely.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
