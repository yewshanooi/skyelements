-- Keep only the newest sales insight for each user.
WITH ranked_insights AS (
    SELECT
        ctid,
        row_number() OVER (
            PARTITION BY user_id
            ORDER BY insight_date DESC, updated_at DESC, ctid DESC
        ) AS row_number
    FROM public.sales_ai_insights
)
DELETE FROM public.sales_ai_insights
WHERE ctid IN (
    SELECT ctid
    FROM ranked_insights
    WHERE row_number > 1
);

ALTER TABLE public.sales_ai_insights
    DROP CONSTRAINT IF EXISTS sales_ai_insights_pkey;

ALTER TABLE public.sales_ai_insights
    ADD CONSTRAINT sales_ai_insights_pkey PRIMARY KEY (user_id);
