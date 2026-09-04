-- ==============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION 016: DETERMINISTIC SALES METRICS RPC
-- ==============================================================================
-- Enables deterministic, zero-hallucination semantic aggregation directly in PostgreSQL.
-- Multi-tenant isolation: enforces auth.uid() = user_id.
-- Sanitized SQL assembly: validates dimensions, metrics, and parameters.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.query_sales_metrics(
    p_metrics text[],
    p_dimensions text[] DEFAULT '{}',
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_category text DEFAULT NULL,
    p_marketplace text DEFAULT NULL,
    p_order_status text DEFAULT NULL,
    p_payment_status text DEFAULT NULL,
    p_customer text DEFAULT NULL,
    p_order_by text DEFAULT 'metric_desc',
    p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_sql text;
    v_select_clauses text[] := '{}';
    v_group_clauses text[] := '{}';
    v_where_clauses text[] := '{}';
    v_order_clause text := '';
    v_limit_val integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
    v_dim text;
    v_metric text;
    v_dim_count integer := 0;
    v_result jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Enforce strict multi-tenant isolation
    v_where_clauses := array_append(v_where_clauses, format('user_id = %L', v_user_id));

    -- Optional Predicate Filters (sanitized with %L literal placeholders)
    IF p_start_date IS NOT NULL THEN
        v_where_clauses := array_append(v_where_clauses, format('date >= %L', p_start_date));
    END IF;

    IF p_end_date IS NOT NULL THEN
        v_where_clauses := array_append(v_where_clauses, format('date <= %L', p_end_date));
    END IF;

    IF p_category IS NOT NULL AND trim(p_category) <> '' THEN
        v_where_clauses := array_append(v_where_clauses, format('category = %L', trim(p_category)));
    END IF;

    IF p_marketplace IS NOT NULL AND trim(p_marketplace) <> '' THEN
        v_where_clauses := array_append(v_where_clauses, format('marketplace = %L', trim(p_marketplace)));
    END IF;

    IF p_order_status IS NOT NULL AND trim(p_order_status) <> '' THEN
        v_where_clauses := array_append(v_where_clauses, format('order_status = %L', trim(p_order_status)));
    END IF;

    IF p_payment_status IS NOT NULL AND trim(p_payment_status) <> '' THEN
        v_where_clauses := array_append(v_where_clauses, format('payment_status = %L', trim(p_payment_status)));
    END IF;

    IF p_customer IS NOT NULL AND trim(p_customer) <> '' THEN
        v_where_clauses := array_append(v_where_clauses, format('customer ILIKE %L', '%' || trim(p_customer) || '%'));
    END IF;

    -- Process Dimensions (Group By targets)
    IF p_dimensions IS NOT NULL THEN
        FOREACH v_dim IN ARRAY p_dimensions LOOP
            CASE lower(trim(v_dim))
                WHEN 'month' THEN
                    v_select_clauses := array_append(v_select_clauses, 'TO_CHAR(date, ''YYYY-MM'') AS month');
                    v_group_clauses := array_append(v_group_clauses, 'TO_CHAR(date, ''YYYY-MM'')');
                    v_dim_count := v_dim_count + 1;
                WHEN 'date' THEN
                    v_select_clauses := array_append(v_select_clauses, 'TO_CHAR(date, ''YYYY-MM-DD'') AS date');
                    v_group_clauses := array_append(v_group_clauses, 'date');
                    v_dim_count := v_dim_count + 1;
                WHEN 'category' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(category, ''''), ''Uncategorized'') AS category');
                    v_group_clauses := array_append(v_group_clauses, 'category');
                    v_dim_count := v_dim_count + 1;
                WHEN 'marketplace' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(marketplace, ''''), ''Direct'') AS marketplace');
                    v_group_clauses := array_append(v_group_clauses, 'marketplace');
                    v_dim_count := v_dim_count + 1;
                WHEN 'order_status' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(order_status, ''''), ''Unknown'') AS order_status');
                    v_group_clauses := array_append(v_group_clauses, 'order_status');
                    v_dim_count := v_dim_count + 1;
                WHEN 'payment_status' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(payment_status, ''''), ''Unknown'') AS payment_status');
                    v_group_clauses := array_append(v_group_clauses, 'payment_status');
                    v_dim_count := v_dim_count + 1;
                WHEN 'customer' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(customer, ''''), ''Anonymous'') AS customer');
                    v_group_clauses := array_append(v_group_clauses, 'customer');
                    v_dim_count := v_dim_count + 1;
                WHEN 'item' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(NULLIF(item, ''''), ''Untitled Item'') AS item');
                    v_group_clauses := array_append(v_group_clauses, 'item');
                    v_dim_count := v_dim_count + 1;
                ELSE
                    -- Ignore unmapped dimensions
            END CASE;
        END LOOP;
    END IF;

    -- Process Metrics (Aggregation targets)
    IF p_metrics IS NOT NULL THEN
        FOREACH v_metric IN ARRAY p_metrics LOOP
            CASE lower(trim(v_metric))
                WHEN 'revenue' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(ROUND(SUM(subtotal)::numeric, 2), 0.00)::float AS revenue');
                WHEN 'cost' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(ROUND(SUM(cost)::numeric, 2), 0.00)::float AS cost');
                WHEN 'profit' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(ROUND(SUM(subtotal - cost)::numeric, 2), 0.00)::float AS profit');
                WHEN 'units_sold' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(SUM(quantity), 0)::int AS units_sold');
                WHEN 'order_count' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COUNT(*)::int AS order_count');
                WHEN 'aov' THEN
                    v_select_clauses := array_append(v_select_clauses, 'COALESCE(ROUND(AVG(subtotal)::numeric, 2), 0.00)::float AS aov');
                ELSE
                    -- Ignore unmapped metrics
            END CASE;
        END LOOP;
    END IF;

    -- Default to revenue if no metrics requested
    IF array_length(v_select_clauses, 1) IS NULL OR (v_dim_count > 0 AND array_length(v_select_clauses, 1) = v_dim_count) THEN
        v_select_clauses := array_append(v_select_clauses, 'COALESCE(ROUND(SUM(subtotal)::numeric, 2), 0.00)::float AS revenue');
    END IF;

    -- Construct Deterministic ORDER BY
    CASE lower(COALESCE(p_order_by, 'metric_desc'))
        WHEN 'metric_asc' THEN
            IF v_dim_count > 0 THEN
                v_order_clause := format('ORDER BY %s ASC NULLS LAST', v_dim_count + 1);
            ELSE
                v_order_clause := '';
            END IF;
        WHEN 'dimension_asc' THEN
            IF v_dim_count > 0 THEN
                v_order_clause := 'ORDER BY 1 ASC';
            ELSE
                v_order_clause := '';
            END IF;
        WHEN 'dimension_desc' THEN
            IF v_dim_count > 0 THEN
                v_order_clause := 'ORDER BY 1 DESC';
            ELSE
                v_order_clause := '';
            END IF;
        ELSE
            -- metric_desc default
            IF v_dim_count > 0 THEN
                v_order_clause := format('ORDER BY %s DESC NULLS LAST', v_dim_count + 1);
            ELSE
                v_order_clause := '';
            END IF;
    END CASE;

    -- Assemble full query
    v_sql := 'SELECT jsonb_agg(t) FROM (' ||
             'SELECT ' || array_to_string(v_select_clauses, ', ') ||
             ' FROM public.sales' ||
             ' WHERE ' || array_to_string(v_where_clauses, ' AND ');

    IF array_length(v_group_clauses, 1) > 0 THEN
        v_sql := v_sql || ' GROUP BY ' || array_to_string(v_group_clauses, ', ');
    END IF;

    IF v_order_clause <> '' THEN
        v_sql := v_sql || ' ' || v_order_clause;
    END IF;

    v_sql := v_sql || ' LIMIT ' || v_limit_val || ') t';

    EXECUTE v_sql INTO v_result;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Secure access
REVOKE ALL ON FUNCTION public.query_sales_metrics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.query_sales_metrics TO authenticated;
