-- =============================================================================
-- Migration: Create task_comments table and RLS policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Allow authenticated users to view all comments (public to everyone logged in)
DROP POLICY IF EXISTS "Allow authenticated users to view task comments" ON public.task_comments;
CREATE POLICY "Allow authenticated users to view task comments"
  ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Allow authenticated users to post comments
DROP POLICY IF EXISTS "Allow authenticated users to post task comments" ON public.task_comments;
CREATE POLICY "Allow authenticated users to post task comments"
  ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. DELETE: Allow users to delete their own comments
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.task_comments;
CREATE POLICY "Allow users to delete their own comments"
  ON public.task_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
