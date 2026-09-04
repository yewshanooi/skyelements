-- ==============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION 015: REMOVE PRE-FILLED DEFAULT VALUES
-- ==============================================================================

-- Remove auto-filled default values so empty user fields remain empty
ALTER TABLE public.sales ALTER COLUMN quantity SET DEFAULT 0;

ALTER TABLE public.sales ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN category SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN category DROP NOT NULL;

ALTER TABLE public.sales ALTER COLUMN marketplace DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN marketplace SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN marketplace DROP NOT NULL;

ALTER TABLE public.sales ALTER COLUMN payment_method DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN payment_method SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN payment_method DROP NOT NULL;

ALTER TABLE public.sales ALTER COLUMN customer DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN customer SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN customer DROP NOT NULL;

ALTER TABLE public.sales ALTER COLUMN order_status DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN order_status SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN order_status DROP NOT NULL;

ALTER TABLE public.sales ALTER COLUMN payment_status DROP DEFAULT;
ALTER TABLE public.sales ALTER COLUMN payment_status SET DEFAULT '';
ALTER TABLE public.sales ALTER COLUMN payment_status DROP NOT NULL;
