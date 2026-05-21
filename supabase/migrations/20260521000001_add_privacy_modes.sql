-- Add is_private column to tasks, summaries, and roadmaps
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Update RLS Policies (Optional but recommended)
-- For now, we'll keep it simple and handle visibility in the UI as requested, 
-- but you might want to restrict this in the future.
