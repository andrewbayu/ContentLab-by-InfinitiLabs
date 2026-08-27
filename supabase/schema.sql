-- ====================================================================
-- ContentLab Supabase Database DDL Schema
-- Enables Multi-Brand, Multi-Project, Realtime, and High Performance
-- ====================================================================

-- 1. Client Brands Registry Table
CREATE TABLE IF NOT EXISTS public.client_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT NOT NULL,
  brand TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_client_brand UNIQUE (client, brand)
);

-- 2. Team Members Registry Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'team' CHECK (role IN ('super', 'team', 'client')),
  client_access TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Main Tasks & Content Items Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  brief TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Idea',
  channel TEXT DEFAULT '',
  format TEXT DEFAULT 'Feed/Reels',
  priority TEXT DEFAULT 'Medium',
  assignee TEXT DEFAULT '',
  owner_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  collaborator_ids JSONB DEFAULT '[]'::jsonb,
  publish_date TEXT DEFAULT '',
  assets_link TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  cover_image_id TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  platform_notes TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  creator_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  views TEXT DEFAULT '',
  likes TEXT DEFAULT '',
  engagement TEXT DEFAULT '',
  task_type TEXT DEFAULT 'Content' CHECK (task_type IN ('Content', 'General')),
  category TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  client TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast multi-brand and client filtering
CREATE INDEX IF NOT EXISTS idx_tasks_client_brand ON public.tasks (client, brand);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON public.tasks (owner_id);

-- 5. Discussion & Revision Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  mentioned_user_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments (task_id);

-- 6. KPI Definitions Table
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_brand_id UUID REFERENCES public.client_brands(id) ON DELETE CASCADE,
  client TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Business',
  unit TEXT DEFAULT 'Number',
  baseline NUMERIC DEFAULT 0,
  target NUMERIC NOT NULL,
  direction TEXT DEFAULT 'increase' CHECK (direction IN ('increase', 'decrease')),
  cadence TEXT DEFAULT 'Monthly' CHECK (cadence IN ('Weekly', 'Monthly', 'Quarterly')),
  weight NUMERIC DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. KPI Updates Log Table
CREATE TABLE IF NOT EXISTS public.kpi_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  actual NUMERIC NOT NULL,
  notes TEXT DEFAULT '',
  source_link TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Documents & Quick Notes Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'Note' CHECK (type IN ('Note', 'Link')),
  body TEXT DEFAULT '',
  url TEXT DEFAULT '',
  owner_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('personal', 'team', 'client')),
  client TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  tags TEXT DEFAULT '',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Task Resources (links and uploaded images)
CREATE TABLE IF NOT EXISTS public.task_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'link' CHECK (type IN ('image', 'link')),
  title TEXT NOT NULL DEFAULT 'Untitled resource',
  url TEXT NOT NULL DEFAULT '',
  storage_path TEXT DEFAULT '',
  mime_type TEXT DEFAULT '',
  file_size BIGINT,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client')),
  client TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_resources_task_id ON public.task_resources (task_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_visibility_client ON public.task_resources (visibility, client, brand);

-- 10. Notifications Table (in-app notification for @mentions in comments)
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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;

-- ContentLab currently authenticates through team_members rather than Supabase
-- Auth. Keep the database policy compatible with that model; the app filters
-- notification reads by the logged-in team member ID.
DROP POLICY IF EXISTS "ContentLab notifications app access" ON public.notifications;
CREATE POLICY "ContentLab notifications app access"
  ON public.notifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Supabase Realtime on Tasks, Comments, Resources, and Notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
