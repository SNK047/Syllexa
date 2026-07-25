-- ============================================
-- Migration: Fix missing INSERT RLS policies
-- Run in Supabase SQL Editor
-- ============================================

-- credits_log: need INSERT for addCredits to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own credits'
      AND tablename = 'credits_log'
  ) THEN
    CREATE POLICY "Users can insert own credits"
      ON credits_log FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- activity_logs: need INSERT for logging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert activity logs'
      AND tablename = 'activity_logs'
  ) THEN
    CREATE POLICY "Users can insert activity logs"
      ON activity_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
