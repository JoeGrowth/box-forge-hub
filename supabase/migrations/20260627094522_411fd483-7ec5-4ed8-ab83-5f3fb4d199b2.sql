
CREATE OR REPLACE FUNCTION public.get_event_audit()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint; v_with_key bigint; v_missing_key bigint; v_dupes bigint;
  v_dead_letters bigint; v_unprocessed bigint; v_unprocessed_stale bigint;
  v_funnel_users bigint; v_distinct_event_users bigint;
  v_projection_drift jsonb; v_checks jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*), count(*) FILTER (WHERE idempotency_key IS NOT NULL)
    INTO v_total, v_with_key FROM public.graph_events;
  v_missing_key := v_total - v_with_key;

  SELECT COALESCE(sum(c - 1), 0) INTO v_dupes
    FROM (SELECT count(*) AS c FROM public.graph_events
          WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1) d;

  SELECT count(*) INTO v_dead_letters FROM public.graph_dead_letters;
  SELECT count(*) INTO v_unprocessed FROM public.graph_events WHERE processed_at IS NULL;
  SELECT count(*) INTO v_unprocessed_stale FROM public.graph_events
    WHERE processed_at IS NULL AND occurred_at < now() - interval '5 minutes';

  SELECT count(*) INTO v_funnel_users FROM public.funnel_progress WHERE signup_at IS NOT NULL;
  SELECT count(DISTINCT user_id) INTO v_distinct_event_users FROM public.graph_events;

  v_projection_drift := jsonb_build_object(
    'funnel_users', v_funnel_users,
    'distinct_event_users', v_distinct_event_users,
    'delta', (v_distinct_event_users - v_funnel_users),
    'relationships_table', (SELECT count(*) FROM public.advisor_relationships),
    'relationship_health_rows', (SELECT count(*) FROM public.relationship_health),
    'commitments_table', (SELECT count(*) FROM public.commitments),
    'contributions_table', (SELECT count(*) FROM public.contributions)
  );

  v_checks := jsonb_build_array(
    jsonb_build_object('name','Idempotency coverage','value',
      CASE WHEN v_total = 0 THEN 100 ELSE round(v_with_key::numeric / v_total * 100, 1) END,
      'unit','%','status',
      CASE WHEN v_total = 0 OR v_with_key::numeric / v_total >= 0.95 THEN 'pass'
           WHEN v_with_key::numeric / v_total >= 0.80 THEN 'warn' ELSE 'fail' END,
      'detail', v_missing_key || ' events without idempotency_key'),
    jsonb_build_object('name','Duplicate idempotency keys','value', v_dupes, 'unit','',
      'status', CASE WHEN v_dupes = 0 THEN 'pass' ELSE 'fail' END,
      'detail','Unique constraint should keep this at 0'),
    jsonb_build_object('name','Dead letters','value', v_dead_letters,'unit','',
      'status', CASE WHEN v_dead_letters = 0 THEN 'pass'
                     WHEN v_dead_letters < 10 THEN 'warn' ELSE 'fail' END,
      'detail','Events that failed all retries'),
    jsonb_build_object('name','Unprocessed > 5m','value', v_unprocessed_stale,'unit','',
      'status', CASE WHEN v_unprocessed_stale = 0 THEN 'pass'
                     WHEN v_unprocessed_stale < 25 THEN 'warn' ELSE 'fail' END,
      'detail', v_unprocessed || ' total unprocessed'),
    jsonb_build_object('name','Projection user drift','value',
      abs(v_distinct_event_users - v_funnel_users),'unit','users',
      'status', CASE WHEN abs(v_distinct_event_users - v_funnel_users) = 0 THEN 'pass'
                     WHEN abs(v_distinct_event_users - v_funnel_users) < 5 THEN 'warn'
                     ELSE 'fail' END,
      'detail','|distinct event users - funnel users|')
  );

  RETURN jsonb_build_object(
    'generated_at', now(),
    'totals', jsonb_build_object(
      'events', v_total, 'with_idempotency_key', v_with_key,
      'missing_idempotency_key', v_missing_key, 'duplicates', v_dupes,
      'dead_letters', v_dead_letters, 'unprocessed', v_unprocessed,
      'unprocessed_stale_5m', v_unprocessed_stale),
    'projections', v_projection_drift,
    'checks', v_checks
  );
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN jsonb_build_object('error', SQLERRM, 'generated_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_review()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_boxes jsonb; v_advisors jsonb; v_templates jsonb;
  v_unfilled jsonb; v_alerts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  -- Healthiest boxes
  SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_boxes FROM (
    SELECT
      b.id AS box_id, b.name,
      count(DISTINCT r.id) AS active_relationships,
      round(COALESCE(avg(h.health_score), 0)::numeric, 1) AS avg_health,
      count(DISTINCT ba.user_id) AS advisor_count
    FROM public.boxes b
    LEFT JOIN public.box_advisors ba ON ba.box_id = b.id AND ba.status = 'active'
    LEFT JOIN public.advisor_relationships r ON r.box_id = b.id AND r.status = 'active'
    LEFT JOIN public.relationship_health h ON h.relationship_id = r.id
    GROUP BY b.id, b.name
    ORDER BY avg_health DESC NULLS LAST, active_relationships DESC
    LIMIT 10
  ) b;

  -- Top advisors by successful relationships (health >= 70, last 90d)
  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) INTO v_advisors FROM (
    SELECT
      r.advisor_id,
      p.full_name AS advisor_name,
      count(DISTINCT r.id) AS total_relationships,
      count(DISTINCT r.id) FILTER (WHERE h.health_score >= 70) AS successful_relationships,
      round(COALESCE(avg(h.health_score), 0)::numeric, 1) AS avg_health,
      count(DISTINCT c.id) AS verified_contributions
    FROM public.advisor_relationships r
    LEFT JOIN public.relationship_health h ON h.relationship_id = r.id
    LEFT JOIN public.profiles p ON p.user_id = r.advisor_id
    LEFT JOIN public.contributions c ON c.user_id = r.user_id AND c.verified_at IS NOT NULL
      AND c.created_at >= r.created_at
    WHERE r.created_at > now() - interval '90 days'
    GROUP BY r.advisor_id, p.full_name
    HAVING count(DISTINCT r.id) > 0
    ORDER BY successful_relationships DESC, avg_health DESC
    LIMIT 10
  ) a;

  -- Most-completed ritual templates last 30d
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates FROM (
    SELECT
      rt.id AS template_id, rt.name, rt.cadence,
      count(ri.*) FILTER (WHERE ri.status = 'completed' AND ri.created_at > now() - interval '30 days') AS completed_30d,
      count(ri.*) FILTER (WHERE ri.created_at > now() - interval '30 days') AS scheduled_30d,
      CASE WHEN count(ri.*) FILTER (WHERE ri.created_at > now() - interval '30 days') = 0 THEN 0
           ELSE round(count(ri.*) FILTER (WHERE ri.status = 'completed' AND ri.created_at > now() - interval '30 days')::numeric
                / count(ri.*) FILTER (WHERE ri.created_at > now() - interval '30 days') * 100, 1) END AS completion_pct
    FROM public.ritual_templates rt
    LEFT JOIN public.ritual_instances ri ON ri.template_id = rt.id
    GROUP BY rt.id, rt.name, rt.cadence
    ORDER BY completed_30d DESC, completion_pct DESC
    LIMIT 10
  ) t;

  -- Unfilled opportunities (oldest open)
  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb) INTO v_unfilled FROM (
    SELECT
      o.id AS opportunity_id, o.title, o.type, o.status,
      EXTRACT(EPOCH FROM (now() - o.created_at))::int AS age_seconds,
      (SELECT count(*) FROM public.opportunity_applications oa WHERE oa.opportunity_id = o.id) AS applications,
      o.created_at
    FROM public.opportunities o
    WHERE o.status IN ('open','published')
      AND o.created_at < now() - interval '7 days'
    ORDER BY o.created_at ASC
    LIMIT 10
  ) o;

  -- Recurring alerts (grouped by code over current snapshot)
  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) INTO v_alerts FROM (
    SELECT code, count(*) AS occurrences,
           max(severity) AS severity,
           min(detected_at) AS first_seen
    FROM public.system_alerts
    GROUP BY code
    ORDER BY occurrences DESC
    LIMIT 10
  ) a;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'period_days', 7,
    'healthiest_boxes', v_boxes,
    'top_advisors', v_advisors,
    'top_templates', v_templates,
    'unfilled_opportunities', v_unfilled,
    'recurring_alerts', v_alerts
  );
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN jsonb_build_object('error', SQLERRM, 'generated_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_audit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_weekly_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_review() TO authenticated;
