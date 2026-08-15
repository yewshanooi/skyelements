-- Public buckets can serve files through their public URLs without an
-- `storage.objects` SELECT policy. Keeping this broad policy also allows
-- clients to list every object in the bucket.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
