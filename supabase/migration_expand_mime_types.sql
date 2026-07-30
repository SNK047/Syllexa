-- ============================================
-- Migration: Expand allowed MIME types for notes bucket
-- Run in Supabase SQL Editor
-- ============================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'notes';
