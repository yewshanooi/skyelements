-- ==============================================================================
-- 020: Server-side sales dropdown options (Category, Store, Order Status, ...)
--      and per-user dashboard settings.
--
-- Replaces browser localStorage so that options, colors and preferences sync
-- across every device / browser the user signs in on.
--
-- Sales rows still reference options by their display text (unchanged), so
-- no existing sales data is modified by this migration.
-- ==============================================================================

-- 1. Options table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
    type TEXT NOT NULL CHECK (type IN ('category', 'marketplace', 'order_status', 'payment_status', 'payment_method')),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
    color TEXT NOT NULL DEFAULT 'tag-default' CHECK (
        color IN ('tag-default', 'tag-gray', 'tag-brown', 'tag-orange', 'tag-yellow',
                  'tag-green', 'tag-blue', 'tag-purple', 'tag-pink', 'tag-red')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- One option per (user, type, case-insensitive name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_options_unique_name
    ON public.sales_options(user_id, type, lower(name));
CREATE INDEX IF NOT EXISTS idx_sales_options_user_type
    ON public.sales_options(user_id, type, created_at);

ALTER TABLE public.sales_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sales options" ON public.sales_options;
CREATE POLICY "Users can view their own sales options"
    ON public.sales_options FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales options" ON public.sales_options;
CREATE POLICY "Users can insert their own sales options"
    ON public.sales_options FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales options" ON public.sales_options;
CREATE POLICY "Users can update their own sales options"
    ON public.sales_options FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales options" ON public.sales_options;
CREATE POLICY "Users can delete their own sales options"
    ON public.sales_options FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_sales_options_updated_at ON public.sales_options;
CREATE TRIGGER set_sales_options_updated_at
    BEFORE UPDATE ON public.sales_options
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Atomic rename: updates the option AND every sale row that uses it ----------
CREATE OR REPLACE FUNCTION public.rename_sales_option(
    p_type TEXT,
    p_old_name TEXT,
    p_new_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_new TEXT := btrim(p_new_name);
    v_option_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF v_new IS NULL OR char_length(v_new) = 0 OR char_length(v_new) > 100 THEN
        RAISE EXCEPTION 'Option name must be between 1 and 100 characters';
    END IF;

    SELECT id INTO v_option_id
    FROM public.sales_options
    WHERE user_id = v_uid AND type = p_type AND name = p_old_name;

    IF v_option_id IS NULL THEN
        RAISE EXCEPTION 'Option not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sales_options
        WHERE user_id = v_uid AND type = p_type
          AND lower(name) = lower(v_new) AND id <> v_option_id
    ) THEN
        RAISE EXCEPTION 'An option with this name already exists';
    END IF;

    UPDATE public.sales_options SET name = v_new WHERE id = v_option_id;

    IF p_type = 'category' THEN
        UPDATE public.sales SET category = v_new WHERE user_id = v_uid AND category = p_old_name;
    ELSIF p_type = 'marketplace' THEN
        UPDATE public.sales SET marketplace = v_new WHERE user_id = v_uid AND marketplace = p_old_name;
    ELSIF p_type = 'order_status' THEN
        UPDATE public.sales SET order_status = v_new WHERE user_id = v_uid AND order_status = p_old_name;
    ELSIF p_type = 'payment_status' THEN
        UPDATE public.sales SET payment_status = v_new WHERE user_id = v_uid AND payment_status = p_old_name;
    ELSIF p_type = 'payment_method' THEN
        UPDATE public.sales SET payment_method = v_new WHERE user_id = v_uid AND payment_method = p_old_name;
    ELSE
        RAISE EXCEPTION 'Invalid option type';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_sales_option(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_sales_option(TEXT, TEXT, TEXT) TO authenticated;

-- 3. Per-user dashboard settings (formula, column widths, chart layouts, ...) ----
CREATE TABLE IF NOT EXISTS public.sales_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(settings::text) <= 65536),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sales_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sales settings" ON public.sales_settings;
CREATE POLICY "Users can view their own sales settings"
    ON public.sales_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales settings" ON public.sales_settings;
CREATE POLICY "Users can insert their own sales settings"
    ON public.sales_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales settings" ON public.sales_settings;
CREATE POLICY "Users can update their own sales settings"
    ON public.sales_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales settings" ON public.sales_settings;
CREATE POLICY "Users can delete their own sales settings"
    ON public.sales_settings FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_sales_settings_updated_at ON public.sales_settings;
CREATE TRIGGER set_sales_settings_updated_at
    BEFORE UPDATE ON public.sales_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Atomic top-level key merge so two devices saving different keys don't clobber each other
CREATE OR REPLACE FUNCTION public.patch_sales_settings(p_patch JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
        RAISE EXCEPTION 'Patch must be a JSON object';
    END IF;

    INSERT INTO public.sales_settings (user_id, settings)
    VALUES (v_uid, p_patch)
    ON CONFLICT (user_id)
    DO UPDATE SET settings = public.sales_settings.settings || EXCLUDED.settings;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_sales_settings(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patch_sales_settings(JSONB) TO authenticated;

-- 4. Realtime: push option/setting changes to the user's other open devices ------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales_options'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_options;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales_settings'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_settings;
        END IF;
    END IF;
END $$;

-- 5. One-time backfill for existing users --------------------------------------
-- Brand-new users start with NO options. Existing users keep the values their
-- sales already use, so nothing disappears from their dropdowns/filters.
-- (Per-browser colors lived in localStorage and cannot be recovered here; the
-- previous built-in default colors are applied to the stock names, everything
-- else starts as 'tag-default' and can be recolored in the UI.)
INSERT INTO public.sales_options (user_id, type, name, color)
SELECT DISTINCT ON (user_id, type, lower(name))
    user_id,
    type,
    name,
    CASE
        WHEN type = 'order_status' AND name = 'Processing' THEN 'tag-red'
        WHEN type = 'order_status' AND name = 'Shipped' THEN 'tag-yellow'
        WHEN type = 'order_status' AND name = 'Delivered' THEN 'tag-green'
        WHEN type = 'payment_status' AND name = 'On Hold' THEN 'tag-red'
        WHEN type = 'payment_status' AND name = 'Processing' THEN 'tag-yellow'
        WHEN type = 'payment_status' AND name = 'Paid' THEN 'tag-green'
        WHEN type = 'marketplace' AND name = 'Shopee' THEN 'tag-orange'
        WHEN type = 'marketplace' AND name = 'Carousell' THEN 'tag-red'
        WHEN type = 'payment_method' AND name = 'Online Banking' THEN 'tag-yellow'
        WHEN type = 'payment_method' AND name IN ('E-Wallet', 'E-Wallet - Business') THEN 'tag-blue'
        WHEN type = 'payment_method' AND name LIKE 'Shopee - %' THEN 'tag-orange'
        WHEN type = 'category' THEN 'tag-gray'
        ELSE 'tag-default'
    END
FROM (
    SELECT user_id, 'category'::text AS type, btrim(category) AS name FROM public.sales
    UNION ALL
    SELECT user_id, 'marketplace', btrim(marketplace) FROM public.sales
    UNION ALL
    SELECT user_id, 'order_status', btrim(order_status) FROM public.sales
    UNION ALL
    SELECT user_id, 'payment_status', btrim(payment_status) FROM public.sales
    UNION ALL
    SELECT user_id, 'payment_method', btrim(payment_method) FROM public.sales
) AS used
WHERE name IS NOT NULL AND char_length(name) BETWEEN 1 AND 100
ORDER BY user_id, type, lower(name), name
ON CONFLICT DO NOTHING;
