-- ==============================================================================
-- 021: Make sure users can delete their own sales_options rows.
--
-- Without the DELETE privilege or policy, PostgREST answers a delete with
-- "success, 0 rows", so options silently stayed in the table. This is
-- idempotent and safe to re-run.
-- ==============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_options TO authenticated;

ALTER TABLE public.sales_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own sales options" ON public.sales_options;
CREATE POLICY "Users can delete their own sales options"
    ON public.sales_options FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
