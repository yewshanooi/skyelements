-- ==============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION 019: HARDEN AI CHAT & STORAGE SECURITY
-- ==============================================================================
-- 1. Restrict allowed MIME types & enforce private storage on `chat-uploads`
-- 2. Prevent path traversal in storage object insert policies
-- 3. Explicitly qualify column identifiers in ai_attachments RLS policy
-- 4. Add size & length constraints to prevent table bloat and abuse
-- ==============================================================================

-- 1. Restrict allowed MIME types & ensure 20MB file limit on chat-uploads
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-c++',
    'text/x-typescript'
  ]::text[]
WHERE id = 'chat-uploads';

-- 2. Harden storage policies on chat-uploads against path traversal
DROP POLICY IF EXISTS "Users can upload their own chat uploads" ON storage.objects;
CREATE POLICY "Users can upload their own chat uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%\%'
  );

DROP POLICY IF EXISTS "Users can view their own chat uploads" ON storage.objects;
CREATE POLICY "Users can view their own chat uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own chat uploads" ON storage.objects;
CREATE POLICY "Users can delete their own chat uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Explicitly qualify ai_attachments.message_id in RLS policies
DROP POLICY IF EXISTS "Users can manage their ai_attachments" ON public.ai_attachments;
CREATE POLICY "Users can manage their ai_attachments"
  ON public.ai_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_chats c ON c.id = m.chat_id
    WHERE m.id = ai_attachments.message_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_chats c ON c.id = m.chat_id
    WHERE m.id = ai_attachments.message_id AND c.user_id = auth.uid()
  ));

-- 4. Check constraints to prevent database bloat / payload abuse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_chats_title_length'
  ) THEN
    ALTER TABLE public.ai_chats ADD CONSTRAINT chk_ai_chats_title_length CHECK (length(title) <= 255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_chats_model_length'
  ) THEN
    ALTER TABLE public.ai_chats ADD CONSTRAINT chk_ai_chats_model_length CHECK (length(model) <= 64);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_messages_content_length'
  ) THEN
    ALTER TABLE public.ai_messages ADD CONSTRAINT chk_ai_messages_content_length CHECK (length(content) <= 100000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_attachments_lengths'
  ) THEN
    ALTER TABLE public.ai_attachments ADD CONSTRAINT chk_ai_attachments_lengths CHECK (
      length(file_url) <= 1024 AND
      length(file_name) <= 255 AND
      length(file_mime_type) <= 128
    );
  END IF;
END $$;
