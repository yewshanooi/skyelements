-- Add image_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a PRIVATE storage bucket for chat images (4 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-images', 'chat-images', false, 4194304)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload images under their own user_id/ prefix
CREATE POLICY "Users can upload their own chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can view their own chat images
CREATE POLICY "Users can view their own chat images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can delete their own chat images
CREATE POLICY "Users can delete their own chat images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
