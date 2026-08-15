-- OAuth providers may update `avatar_url` in user metadata on sign-in.
-- Preserve avatars previously uploaded by Lithium in an app-owned key.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'lithium_avatar_url',
  raw_user_meta_data ->> 'avatar_url'
)
WHERE COALESCE(raw_user_meta_data ->> 'lithium_avatar_url', '') = ''
  AND raw_user_meta_data ->> 'avatar_url' LIKE '%/storage/v1/object/public/avatars/%';
