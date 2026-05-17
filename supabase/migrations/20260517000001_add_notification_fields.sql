-- =============================================================================
-- Migration: Add background notification support
-- =============================================================================
-- Adds three boolean "notified" columns to the tasks table to prevent
-- duplicate push notifications across cron runs.
-- Also creates user_notification_tokens if it doesn't already exist.
-- =============================================================================

-- ─── 1. Add notification-state columns to tasks ──────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS notified_2h  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notified_30m BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notified_5m  BOOLEAN NOT NULL DEFAULT FALSE;

-- Index: speed up the cron query (filters on done + time + notified flags)
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_check
  ON public.tasks (done, time, notified_2h, notified_30m, notified_5m)
  WHERE done = FALSE AND time IS NOT NULL;

-- ─── 2. Reset notified flags when a task's deadline is updated ───────────────
-- This ensures that if a user moves a deadline, they get new reminders.
CREATE OR REPLACE FUNCTION public.reset_notification_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.time IS DISTINCT FROM OLD.time THEN
    NEW.notified_2h  := FALSE;
    NEW.notified_30m := FALSE;
    NEW.notified_5m  := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_notification_flags ON public.tasks;

CREATE TRIGGER trg_reset_notification_flags
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_notification_flags();

-- ─── 3. Create user_notification_tokens (if not exists) ──────────────────────
CREATE TABLE IF NOT EXISTS public.user_notification_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One token slot per user; upsert replaces the existing token
  UNIQUE (user_id)
);

-- Keep updated_at fresh on every upsert
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tokens_updated_at ON public.user_notification_tokens;

CREATE TRIGGER trg_tokens_updated_at
  BEFORE UPDATE ON public.user_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Row-Level Security for user_notification_tokens ──────────────────────
ALTER TABLE public.user_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own token
DROP POLICY IF EXISTS "Users manage own token" ON public.user_notification_tokens;
CREATE POLICY "Users manage own token"
  ON public.user_notification_tokens
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Edge Function (service role) bypasses RLS automatically — no extra policy needed.

-- ─── 5. Grant permissions ─────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_notification_tokens TO authenticated;
