-- Harden the remaining Security Advisor findings while preserving the
-- authenticated application flows that depend on these RPCs.

-- Trigger and analytics functions do not need caller-controlled name lookup.
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- The sales analytics function only reads rows already protected by sales RLS;
-- execute it as the caller instead of bypassing row-level security.
ALTER FUNCTION public.query_sales_metrics(
  text[], text[], date, date, text, text, text, text, text, text, integer
) SECURITY INVOKER;
ALTER FUNCTION public.query_sales_metrics(
  text[], text[], date, date, text, text, text, text, text, text, integer
) SET search_path = '';

-- Usage display needs only the signed-in user's own counter rows. Avoid reading
-- global counters and run with caller permissions and the policy below.
CREATE OR REPLACE FUNCTION public.get_ai_daily_usage()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  pacific_today DATE := (clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;
  daily_usage JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      models.model_id,
      jsonb_build_object(
        'user_count', CASE
          WHEN user_usage.usage_date = pacific_today THEN user_usage.request_count
          ELSE 0
        END
      )
    ),
    '{}'::jsonb
  )
  INTO daily_usage
  FROM (VALUES
    ('gemini-3.5-flash-lite'),
    ('gemini-3.6-flash'),
    ('gemini-3.8-flash')
  ) AS models(model_id)
  LEFT JOIN public.ai_user_daily_usage AS user_usage
    ON user_usage.model_id = models.model_id
    AND user_usage.user_id = current_user_id;

  RETURN daily_usage;
END;
$$;

-- RLS-enabled internal tables should have explicit policies. Clients cannot
-- access the global shared counter; per-user counters are readable only by
-- their owner and never writable through the table API.
DROP POLICY IF EXISTS "Deny client access to global AI usage" ON public.ai_global_daily_usage;
CREATE POLICY "Deny client access to global AI usage"
  ON public.ai_global_daily_usage FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_user_daily_usage;
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_user_daily_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.ai_global_daily_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_user_daily_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_user_daily_usage TO authenticated;

-- Remove any direct or inherited anonymous/public execution grants. The
-- account-deletion and atomic global-quota functions remain authenticated-only
-- because they must perform privileged database writes after checking auth.uid().
ALTER FUNCTION public.delete_current_user() SET search_path = '';
ALTER FUNCTION public.reserve_ai_daily_request(text) SET search_path = '';

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;

REVOKE ALL ON FUNCTION public.query_sales_metrics(
  text[], text[], date, date, text, text, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.query_sales_metrics(
  text[], text[], date, date, text, text, text, text, text, text, integer
) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_ai_daily_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_daily_request(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_ai_daily_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_daily_usage() TO authenticated;
