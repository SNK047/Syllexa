-- ============================================
-- Migration: Fix requests table
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Add note_id column
ALTER TABLE requests ADD COLUMN IF NOT EXISTS note_id UUID REFERENCES notes(id) ON DELETE SET NULL;

-- 2. Add FK reference on fulfilled_by so PostgREST joins work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'requests_fulfilled_by_fkey'
  ) THEN
    ALTER TABLE requests
      ADD CONSTRAINT requests_fulfilled_by_fkey
      FOREIGN KEY (fulfilled_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add UPDATE RLS policies
-- Owner can edit own open requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own requests'
      AND tablename = 'requests'
  ) THEN
    CREATE POLICY "Users can update own requests"
      ON requests FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Any authenticated user can update open requests (for fulfillment)
-- The server action enforces business logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can fulfill open requests'
      AND tablename = 'requests'
  ) THEN
    CREATE POLICY "Users can fulfill open requests"
      ON requests FOR UPDATE
      USING (auth.uid() IS NOT NULL AND status = 'open');
  END IF;
END $$;
