CREATE OR REPLACE FUNCTION public.get_weekly_review()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_boxes jsonb;
  v_advisors jsonb;
  v_templates jsonb;
  v_unfilled jsonb;
  v_alerts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Healthiest boxes
  SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb)
  INTO v_boxes
  FROM (
    SELECT
      bx.id AS box_id,
      bx.name,
      count(DISTINCT ar.id) AS active_relationships,
      round(COALESCE(avg(rh.health_score), 0)::numeric, 1) AS avg_health,
      count(DISTINCT ba.user_id) AS advisor_count
    FROM public.boxes bx
    LEFT JOIN public.box_advisors ba
      ON ba.box_id = bx.id
     AND ba.status = 'active'
    LEFT JOIN public.advisor_relationships ar
      ON ar.box_id = bx.id
     AND ar.status = 'active'
    LEFT JOIN public.relationship_health rh
      ON rh.relationship_id = ar.id
    GROUP BY bx.id, bx.name
    ORDER BY avg_health DESC NULLS LAST, active_relationships DESC, bx.name ASC
    LIMIT 10
  ) b;

  -- Top advisors by successful relationships and downstream contributions
  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
  INTO v_advisors
  FROM (
    SELECT
      ar.advisor_id,
      COALESCE(p.full_name, 'Unknown advisor') AS advisor_name,
      count(DISTINCT ar.id) AS total_relationships,
      count(DISTINCT ar.id) FILTER (WHERE COALESCE(rh.health_score, 0) >= 70) AS successful_relationships,
      round(COALESCE(avg(rh.health_score), 0)::numeric, 1) AS avg_health,
      count(DISTINCT c.id) AS contributions
    FROM public.advisor_relationships ar
    LEFT JOIN public.relationship_health rh
      ON rh.relationship_id = ar.id
    LEFT JOIN public.profiles p
      ON p.user_id = ar.advisor_id
    LEFT JOIN public.contributions c
      ON c.actor_id = ar.user_id
     AND c.created_at >= ar.created_at
    WHERE ar.created_at > now() - interval '90 days'
    GROUP BY ar.advisor_id, p.full_name
    HAVING count(DISTINCT ar.id) > 0
    ORDER BY successful_relationships DESC, avg_health DESC, contributions DESC
    LIMIT 10
  ) a;

  -- Most-completed ritual templates last 30d
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_templates
  FROM (
    SELECT
      rt.id AS template_id,
      rt.name,
      rt.cadence,
      count(ri.*) FILTER (
        WHERE ri.status = 'completed'
          AND ri.created_at > now() - interval '30 days'
      ) AS completed_30d,
      count(ri.*) FILTER (
        WHERE ri.created_at > now() - interval '30 days'
      ) AS scheduled_30d,
      CASE
        WHEN count(ri.*) FILTER (WHERE ri.created_at > now() - interval '30 days') = 0 THEN 0
        ELSE round(
          count(ri.*) FILTER (
            WHERE ri.status = 'completed'
              AND ri.created_at > now() - interval '30 days'
          )::numeric
          / count(ri.*) FILTER (WHERE ri.created_at > now() - interval '30 days')
          * 100,
          1
        )
      END AS completion_pct
    FROM public.ritual_templates rt
    LEFT JOIN public.ritual_instances ri
      ON ri.template_id = rt.id
    GROUP BY rt.id, rt.name, rt.cadence
    ORDER BY completed_30d DESC, completion_pct DESC, rt.name ASC
    LIMIT 10
  ) t;

  -- Unfilled opportunities older than 7 days
  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb)
  INTO v_unfilled
  FROM (
    SELECT
      op.id AS opportunity_id,
      op.title,
      op.type,
      op.status,
      EXTRACT(EPOCH FROM (now() - op.created_at))::int AS age_seconds,
      (
        SELECT count(*)
        FROM public.opportunity_applications oa
        WHERE oa.opportunity_id = op.id
      ) AS applications,
      op.created_at
    FROM public.opportunities op
    WHERE op.status IN ('open', 'published')
      AND op.created_at < now() - interval '7 days'
    ORDER BY op.created_at ASC
    LIMIT 10
  ) o;

  -- Recurring alerts from the current alert projection
  SELECT COALESCE(jsonb_agg(row_to_json(al)), '[]'::jsonb)
  INTO v_alerts
  FROM (
    SELECT
      sa.code,
      count(*) AS occurrences,
      max(sa.severity) AS severity,
      min(sa.detected_at) AS first_seen
    FROM public.system_alerts sa
    GROUP BY sa.code
    ORDER BY occurrences DESC, first_seen ASC
    LIMIT 10
  ) al;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'period_days', 7,
    'healthiest_boxes', v_boxes,
    'top_advisors', v_advisors,
    'top_templates', v_templates,
    'unfilled_opportunities', v_unfilled,
    'recurring_alerts', v_alerts
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weekly_review() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_review() TO service_role;