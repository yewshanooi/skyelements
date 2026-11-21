-- Replace the retired Gemini 3.6 model with Gemini 4 Hydrogen and align
-- daily request caps with the active model catalogue.

BEGIN;

-- Drop the old allow-list constraints before remapping the retired model ID.
ALTER TABLE public.ai_global_daily_usage
  DROP CONSTRAINT IF EXISTS ai_global_daily_usage_model_id_check;
ALTER TABLE public.ai_user_daily_usage
  DROP CONSTRAINT IF EXISTS ai_user_daily_usage_model_id_check;

UPDATE public.ai_chats
SET model = 'gemini-4-hydrogen'
WHERE model = 'gemini-3.6-flash';

UPDATE public.ai_global_daily_usage
SET model_id = 'gemini-4-hydrogen'
WHERE model_id = 'gemini-3.6-flash';

UPDATE public.ai_user_daily_usage
SET model_id = 'gemini-4-hydrogen'
WHERE model_id = 'gemini-3.6-flash';

ALTER TABLE public.ai_global_daily_usage
  ADD CONSTRAINT ai_global_daily_usage_model_id_check CHECK (model_id IN (
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-4-hydrogen'
  ));
ALTER TABLE public.ai_user_daily_usage
  ADD CONSTRAINT ai_user_daily_usage_model_id_check CHECK (model_id IN (
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-4-hydrogen'
  ));

INSERT INTO public.ai_global_daily_usage (model_id, usage_date, request_count)
VALUES ('gemini-4-hydrogen', (now() AT TIME ZONE 'America/Los_Angeles')::date, 0)
ON CONFLICT (model_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reserve_ai_daily_request(p_model_id text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := p_user_id;
  pacific_today date;
  global_usage_date date;
  global_request_count integer;
  user_usage_date date;
  user_request_count integer;
  user_limit integer;
  global_limit integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_model_id IS NULL OR p_model_id NOT IN (
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-4-hydrogen'
  ) THEN
    RAISE EXCEPTION 'Unsupported AI model';
  END IF;

  IF p_model_id = 'gemini-3.5-flash-lite' THEN
    user_limit := 50;
    global_limit := 500;
  ELSE
    user_limit := 5;
    global_limit := 20;
  END IF;

  -- Serialize reservations for this model to enforce the shared cap atomically.
  pacific_today := (clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;

  INSERT INTO public.ai_global_daily_usage (model_id, usage_date, request_count)
  VALUES (p_model_id, pacific_today, 0)
  ON CONFLICT (model_id) DO NOTHING;

  SELECT usage_date, request_count
    INTO global_usage_date, global_request_count
    FROM public.ai_global_daily_usage
    WHERE model_id = p_model_id
    FOR UPDATE;

  -- Re-evaluate after acquiring the lock in case the request waited over midnight PT.
  pacific_today := (clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;

  IF global_usage_date <> pacific_today THEN
    global_request_count := 0;
    UPDATE public.ai_global_daily_usage
      SET usage_date = pacific_today, request_count = 0
      WHERE model_id = p_model_id;
  END IF;

  INSERT INTO public.ai_user_daily_usage (user_id, model_id, usage_date, request_count)
  VALUES (current_user_id, p_model_id, pacific_today, 0)
  ON CONFLICT (user_id, model_id) DO NOTHING;

  SELECT usage_date, request_count
    INTO user_usage_date, user_request_count
    FROM public.ai_user_daily_usage
    WHERE user_id = current_user_id AND model_id = p_model_id
    FOR UPDATE;

  IF user_usage_date <> pacific_today THEN
    user_request_count := 0;
    UPDATE public.ai_user_daily_usage
      SET usage_date = pacific_today, request_count = 0
      WHERE user_id = current_user_id AND model_id = p_model_id;
  END IF;

  IF user_request_count >= user_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'user_limit',
      'user_count', user_request_count,
      'user_limit', user_limit
    );
  END IF;

  IF global_request_count >= global_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'global_limit',
      'user_count', user_request_count,
      'user_limit', user_limit
    );
  END IF;

  UPDATE public.ai_global_daily_usage
    SET request_count = global_request_count + 1
    WHERE model_id = p_model_id;

  UPDATE public.ai_user_daily_usage
    SET request_count = user_request_count + 1
    WHERE user_id = current_user_id AND model_id = p_model_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', null,
    'user_count', user_request_count + 1,
    'user_limit', user_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_daily_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  pacific_today date := (clock_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;
  daily_usage jsonb;
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
    ('gemini-3.8-flash'),
    ('gemini-4-hydrogen')
  ) AS models(model_id)
  LEFT JOIN public.ai_user_daily_usage AS user_usage
    ON user_usage.model_id = models.model_id
    AND user_usage.user_id = current_user_id;

  RETURN daily_usage;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_daily_request(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_daily_request(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_ai_daily_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_daily_usage() TO authenticated;

COMMIT;
