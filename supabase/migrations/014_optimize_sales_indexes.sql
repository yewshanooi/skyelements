-- ==============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION 014: OPTIMIZE SALES INDEXES & PERFORMANCE
-- ==============================================================================

-- 1. Create optimal composite B-Tree indexes tailored to user-scoped query patterns
-- Primary query: WHERE user_id = $1 ORDER BY date DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_sales_user_date_created 
ON public.sales(user_id, date DESC, created_at DESC);

-- Fast point-lookup for updates, deletes, and specific row fetches under RLS
CREATE INDEX IF NOT EXISTS idx_sales_user_id_lookup 
ON public.sales(user_id, id);

-- Composite index for category filtering and breakdown aggregations
CREATE INDEX IF NOT EXISTS idx_sales_user_category_date 
ON public.sales(user_id, category, date DESC);

-- Composite index for marketplace / channel filtering
CREATE INDEX IF NOT EXISTS idx_sales_user_marketplace_date 
ON public.sales(user_id, marketplace, date DESC);

-- Composite index for order status / Kanban pipeline grouping
CREATE INDEX IF NOT EXISTS idx_sales_user_order_status_date 
ON public.sales(user_id, order_status, date DESC);

-- Composite index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_sales_user_payment_status_date 
ON public.sales(user_id, payment_status, date DESC);

-- Composite index for customer search and analytics leaderboard
CREATE INDEX IF NOT EXISTS idx_sales_user_customer 
ON public.sales(user_id, customer);

-- 2. Drop redundant standalone single-column indexes to reduce write amplification & storage overhead
DROP INDEX IF EXISTS public.idx_sales_date;
DROP INDEX IF EXISTS public.idx_sales_category;
DROP INDEX IF EXISTS public.idx_sales_marketplace;
DROP INDEX IF EXISTS public.idx_sales_order_status;
