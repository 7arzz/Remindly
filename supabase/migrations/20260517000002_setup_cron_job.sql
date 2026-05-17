-- =============================================================================
-- Cron Job: Schedule send-reminders Edge Function every minute
-- =============================================================================
-- Requires: pg_cron extension (enabled by default on Supabase)
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- Enable pg_cron (already enabled on Supabase cloud; safe to run again)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old job if it exists (idempotent)
SELECT cron.unschedule('send-reminders-cron')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-reminders-cron'
);

-- Schedule: every minute, POST to the Edge Function
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference ID
-- (found in: Supabase Dashboard → Settings → General → Reference ID)
SELECT cron.schedule(
  'send-reminders-cron',                      -- job name (unique)
  '* * * * *',                                -- every minute (cron expression)
  $$
  SELECT net.http_post(
    url     => 'https://wdydmrdcxuhtcqqckcmq.supabase.co/functions/v1/send-reminders',
    headers => jsonb_build_object(
      'Content-Type',  'application/json'
    ),
    body    => '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify the job was created
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'send-reminders-cron';

-- =============================================================================
-- ALTERNATIVE: Using pg_net with stored secret (more secure)
-- Store your service role key in Supabase Vault, then reference it:
-- =============================================================================
-- SELECT cron.schedule(
--   'send-reminders-cron',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url     => 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
--     headers => jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--     ),
--     body    => '{}'::jsonb
--   );
--   $$
-- );

-- =============================================================================
-- To PAUSE the cron job:
--   SELECT cron.unschedule('send-reminders-cron');
-- To VIEW recent runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- =============================================================================
