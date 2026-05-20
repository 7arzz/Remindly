-- =============================================================================
-- Migration: Add Row-Level Security policies for roadmaps table
-- =============================================================================

-- Enable RLS on roadmaps
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Allow authenticated users to view all roadmaps
DROP POLICY IF EXISTS "Allow authenticated users to select roadmaps" ON public.roadmaps;
CREATE POLICY "Allow authenticated users to select roadmaps"
  ON public.roadmaps
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Allow authenticated users to insert roadmaps
DROP POLICY IF EXISTS "Allow authenticated users to insert roadmaps" ON public.roadmaps;
CREATE POLICY "Allow authenticated users to insert roadmaps"
  ON public.roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE: Allow authenticated users to update roadmaps
DROP POLICY IF EXISTS "Allow authenticated users to update roadmaps" ON public.roadmaps;
CREATE POLICY "Allow authenticated users to update roadmaps"
  ON public.roadmaps
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. DELETE: Allow authenticated users to delete roadmaps
DROP POLICY IF EXISTS "Allow authenticated users to delete roadmaps" ON public.roadmaps;
CREATE POLICY "Allow authenticated users to delete roadmaps"
  ON public.roadmaps
  FOR DELETE
  TO authenticated
  USING (true);
