-- Rename `chat-images` bucket to `chat-uploads` to reflect that it now
-- holds PDFs, text/code files, etc., in addition to images.

-- Create the new bucket (private, 20 MB file limit to match MAX_FILE_SIZE).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-uploads', 'chat-uploads', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies tied to the previous bucket name.
DROP POLICY IF EXISTS "Users can upload their own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat images" ON storage.objects;

-- Recreate policies for the new bucket.
CREATE POLICY "Users can upload their own chat uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own chat uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own chat uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
