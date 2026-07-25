-- ============================================
-- Migration: Fix UPDATE RLS on requests
-- The USING clause checked status='open' but the new row has status='fulfilled'
-- Fix: add WITH CHECK (true) so the new row passes
-- Run in Supabase SQL Editor
-- ============================================

-- Drop the broken fulfill policy
DROP POLICY IF EXISTS "Users can fulfill open requests" ON requests;

-- Recreate with correct USING + WITH CHECK
-- USING: must be an open request (prevents fulfilling already-done requests)
-- WITH CHECK: allow any new row (server action handles validation)
CREATE POLICY "Users can fulfill open requests"
  ON requests FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'open')
  WITH CHECK (true);
