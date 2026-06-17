
CREATE OR REPLACE FUNCTION public.pick_growth_loop_variant(_loop_key text, _user_id uuid)
 RETURNS TABLE(variant_key text, action_payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base jsonb;
  v_bucket int;
  v_acc int := 0;
  v_variant_key text;
  v_action_payload jsonb;
  r record;
BEGIN
  SELECT gl.action_payload INTO v_base
    FROM public.growth_loops gl
   WHERE gl.loop_key = _loop_key;

  v_bucket := abs(hashtext(_loop_key || ':' || _user_id::text)) % 100;

  FOR r IN
    SELECT gle.variant_key       AS vk,
           gle.allocation_percentage AS pct,
           gle.action_payload_override AS po
      FROM public.growth_loop_experiments gle
     WHERE gle.loop_key = _loop_key AND gle.enabled = true
     ORDER BY gle.variant_key
  LOOP
    v_acc := v_acc + r.pct;
    IF v_bucket < v_acc THEN
      v_variant_key    := r.vk;
      v_action_payload := COALESCE(v_base,'{}'::jsonb) || COALESCE(r.po,'{}'::jsonb);
      variant_key      := v_variant_key;
      action_payload   := v_action_payload;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  v_variant_key    := 'control';
  v_action_payload := COALESCE(v_base,'{}'::jsonb);
  variant_key      := v_variant_key;
  action_payload   := v_action_payload;
  RETURN NEXT;
END
$function$;

-- Regression coverage: dispatch -> notification -> replay safety
CREATE OR REPLACE FUNCTION public.test_growth_loop_dispatch(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first int;
  v_second int;
  v_triggered int;
  v_notified int;
  v_dup int;
BEGIN
  v_first := public.dispatch_growth_loops(_user_id);
  -- Replay: cooldown should suppress all duplicates.
  v_second := public.dispatch_growth_loops(_user_id);

  SELECT COUNT(*) INTO v_triggered
    FROM public.graph_events
   WHERE user_id = _user_id AND event_type = 'growth_loop_triggered';
  SELECT COUNT(*) INTO v_notified
    FROM public.graph_events
   WHERE user_id = _user_id AND event_type = 'growth_loop_notified';

  SELECT COUNT(*) - COUNT(DISTINCT idempotency_key) INTO v_dup
    FROM public.graph_events
   WHERE user_id = _user_id
     AND event_type IN ('growth_loop_triggered','growth_loop_notified');

  RETURN jsonb_build_object(
    'first_dispatch_count', v_first,
    'replay_dispatch_count', v_second,
    'triggered_events', v_triggered,
    'notified_events', v_notified,
    'duplicate_events', v_dup,
    'replay_safe', v_second = 0 AND v_dup = 0
  );
END
$function$;

GRANT EXECUTE ON FUNCTION public.test_growth_loop_dispatch(uuid) TO service_role;
