-- Migration: Add note_id to requests table
-- Run this in Supabase SQL Editor

-- Add note_id column to link fulfilled requests to notes
ALTER TABLE requests ADD COLUMN IF NOT EXISTS note_id UUID REFERENCES notes(id) ON DELETE SET NULL;
