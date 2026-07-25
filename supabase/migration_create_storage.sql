-- ============================================
-- Migration: Create Supabase Storage bucket
-- Run in Supabase SQL Editor
-- ============================================

-- Create the "notes" storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes',
  'notes',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload notes'
      AND bucket_id = 'notes' AND command = 'INSERT'
  ) THEN
    CREATE POLICY "Authenticated users can upload notes"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'notes');
  END IF;
END $$;

-- Allow everyone to read (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for notes'
      AND bucket_id = 'notes' AND command = 'SELECT'
  ) THEN
    CREATE POLICY "Public read access for notes"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'notes');
  END IF;
END $$;

-- Allow owners to delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own notes'
      AND bucket_id = 'notes' AND command = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own notes"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
