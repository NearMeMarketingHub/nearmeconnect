-- =============================================================================
-- Near Me Connect — Backfill Task Data
-- One-time migration: populate assigned_to_name on existing tasks
--
-- Usage:
--   psql $DATABASE_URL -f migrations/backfill-tasks.sql
-- =============================================================================

-- Populate assigned_to_name on all existing tasks where it is blank
-- but assigned_to references a valid user.
UPDATE public.tasks t
SET assigned_to_name = u.first_name || ' ' || u.last_name
FROM public.users u
WHERE t.assigned_to = u.id
  AND (t.assigned_to_name IS NULL OR t.assigned_to_name = '');

-- Report how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.tasks
  WHERE assigned_to_name IS NOT NULL AND assigned_to_name != '';

  RAISE NOTICE 'Tasks with assigned_to_name populated: %', updated_count;
END $$;
