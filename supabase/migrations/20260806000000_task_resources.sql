-- Task resources: links and uploaded images that belong to one task.
-- Visibility is intentionally explicit so the client portal can expose only
-- resources marked `client` for the matching client/brand.
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

ALTER TABLE public.task_resources ENABLE ROW LEVEL SECURITY;

-- ContentLab currently authenticates against the team_members registry rather
-- than Supabase Auth. These policies preserve the app's existing access model;
-- the React client applies role/client visibility filters before rendering.
DROP POLICY IF EXISTS "task resources app access" ON public.task_resources;
CREATE POLICY "task resources app access"
  ON public.task_resources
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Private bucket for future direct uploads. The UI currently falls back to the
-- existing cover-image bucket when this migration has not been applied yet.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contentlab-task-resources',
  'contentlab-task-resources',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "task resource objects app access" ON storage.objects;
CREATE POLICY "task resource objects app access"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'contentlab-task-resources')
  WITH CHECK (bucket_id = 'contentlab-task-resources');

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_resources;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
