-- =============================================================================
-- Migration: Add Row-Level Security policies for tasks table
-- =============================================================================
-- Since tasks are collaborative/public within the Remindly app, logged-in
-- (authenticated) users should be able to view, insert, update, and delete tasks.
-- =============================================================================

-- Enable RLS on tasks (safeguard)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Allow authenticated users to view all tasks
DROP POLICY IF EXISTS "Allow authenticated users to select tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to select tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Allow authenticated users to insert tasks
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to insert tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE: Allow authenticated users to update tasks
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. DELETE: Allow authenticated users to delete tasks
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to delete tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);
