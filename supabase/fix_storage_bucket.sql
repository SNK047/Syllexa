-- ============================================
-- Fix: Storage bucket + all file types
-- Run in Supabase SQL Editor — idempotent
-- ============================================

-- 1. Create or update the notes bucket with ALL allowed MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes',
  'notes',
  true,
  52428800,
  ARRAY[
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
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  file_size_limit = 52428800,
  public = true;

-- 2. RLS: allow authenticated uploads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload notes'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can upload notes"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'notes');
  END IF;
END $$;

-- 3. RLS: public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for notes'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public read access for notes"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'notes');
  END IF;
END $$;

-- 4. RLS: owners can delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own notes'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete own notes"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 5. Ensure notes INSERT RLS works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own notes'
      AND tablename = 'notes' AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can insert own notes"
      ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Ensure credits_log INSERT RLS works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own credits'
      AND tablename = 'credits_log' AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Users can insert own credits"
      ON credits_log FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
