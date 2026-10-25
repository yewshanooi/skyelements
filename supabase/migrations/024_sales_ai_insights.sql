-- Store one generated sales insight per user and Pacific calendar day.
CREATE TABLE IF NOT EXISTS public.sales_ai_insights (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    insight_date DATE NOT NULL,
    summary TEXT NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 2000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, insight_date)
);

ALTER TABLE public.sales_ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sales AI insights" ON public.sales_ai_insights;
CREATE POLICY "Users can view their own sales AI insights"
    ON public.sales_ai_insights FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales AI insights" ON public.sales_ai_insights;
CREATE POLICY "Users can insert their own sales AI insights"
    ON public.sales_ai_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales AI insights" ON public.sales_ai_insights;
CREATE POLICY "Users can update their own sales AI insights"
    ON public.sales_ai_insights FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_sales_ai_insights_updated_at ON public.sales_ai_insights;
CREATE TRIGGER set_sales_ai_insights_updated_at
    BEFORE UPDATE ON public.sales_ai_insights
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
