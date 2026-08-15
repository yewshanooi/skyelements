-- Keep account deletion in the database so it can remove auth.users safely
-- without exposing a service-role key to the application.
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete application rows explicitly; the foreign keys also cascade
  -- messages and message attachments when chats are removed.
  DELETE FROM public.notes WHERE user_id = current_user_id;
  DELETE FROM public.chats WHERE user_id = current_user_id;

  -- Auth rows (including identities) are removed only after user data is gone.
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;

-- Storage objects must be removed through the Storage API. This policy lets
-- that API list only the current user's avatar objects before deletion.
DROP POLICY IF EXISTS "Users can list their own avatars" ON storage.objects;
CREATE POLICY "Users can list their own avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can list their own chat uploads" ON storage.objects;
CREATE POLICY "Users can list their own chat uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('chat-uploads', 'chat-images')
    AND split_part(name, '/', 1) = auth.uid()::text
  );
