-- ==============================================================================
-- SUPABASE DATABASE SCHEMA FOR SALES DASHBOARD (MIGRATION 013)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
    quantity INTEGER NOT NULL DEFAULT 0,
    item TEXT NOT NULL,
    category TEXT DEFAULT '',
    marketplace TEXT DEFAULT '',
    payment_method TEXT DEFAULT '',
    customer TEXT DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sales NUMERIC(12, 2) GENERATED ALWAYS AS (subtotal - cost) STORED,
    order_status TEXT DEFAULT '',
    payment_status TEXT DEFAULT '',
    invoice_url TEXT,
    invoice_name TEXT,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Indexes for High-Performance Multi-Tenant Queries
CREATE INDEX IF NOT EXISTS idx_sales_user_date_created ON public.sales(user_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_id_lookup ON public.sales(user_id, id);
CREATE INDEX IF NOT EXISTS idx_sales_user_category_date ON public.sales(user_id, category, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_marketplace_date ON public.sales(user_id, marketplace, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_order_status_date ON public.sales(user_id, order_status, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_payment_status_date ON public.sales(user_id, payment_status, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_customer ON public.sales(user_id, customer);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Users can only access their own sales)
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
CREATE POLICY "Users can view their own sales"
    ON public.sales FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
CREATE POLICY "Users can insert their own sales"
    ON public.sales FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
CREATE POLICY "Users can update their own sales"
    ON public.sales FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;
CREATE POLICY "Users can delete their own sales"
    ON public.sales FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. Private Storage Bucket for Invoices & Receipts
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('invoices', 'invoices', false, 20971520)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS Policies (Isolated per user folder)
DROP POLICY IF EXISTS "Users can upload their own invoices" ON storage.objects;
CREATE POLICY "Users can upload their own invoices"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own invoices" ON storage.objects;
CREATE POLICY "Users can view their own invoices"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own invoices" ON storage.objects;
CREATE POLICY "Users can update their own invoices"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON storage.objects;
CREATE POLICY "Users can delete their own invoices"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public invoice read access" ON storage.objects;

-- 8. Integration with SkyElements Account Deletion
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

  DELETE FROM public.sales WHERE user_id = current_user_id;
  DELETE FROM public.notes WHERE user_id = current_user_id;
  DELETE FROM public.chats WHERE user_id = current_user_id;

  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
