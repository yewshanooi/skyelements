-- Keep privileged account and quota writes behind trusted server code. The
-- application authenticates users first, then invokes these RPCs with the
-- server-only Supabase secret key and the verified user's ID.

DROP FUNCTION IF EXISTS public.delete_current_user();
DROP FUNCTION IF EXISTS public.delete_current_user(uuid);
CREATE FUNCTION public.delete_current_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  DELETE FROM public.ai_chats WHERE user_id = p_user_id;
  DELETE FROM public.sales WHERE user_id = p_user_id;
  DELETE FROM public.notes WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_current_user(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.reserve_ai_daily_request(text);
DROP FUNCTION IF EXISTS public.reserve_ai_daily_request(text, uuid);
CREATE FUNCTION public.reserve_ai_daily_request(p_model_id text, p_user_id uuid)
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
    'gemini-3.6-flash',
    'gemini-3.8-flash'
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

REVOKE ALL ON FUNCTION public.reserve_ai_daily_request(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_daily_request(text, uuid) TO service_role;
