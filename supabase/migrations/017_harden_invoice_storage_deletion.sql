-- ==============================================================================
-- SUPABASE MIGRATION 017: HARDEN INVOICE STORAGE LIST & ACCOUNT DELETION
-- ==============================================================================
-- Ensures authenticated users can list and delete only their own files in the
-- 'invoices' private storage bucket during standard usage and account deletion.
-- ==============================================================================

DROP POLICY IF EXISTS "Users can list their own invoices" ON storage.objects;
CREATE POLICY "Users can list their own invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own invoices" ON storage.objects;
CREATE POLICY "Users can delete their own invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
