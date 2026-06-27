
CREATE OR REPLACE VIEW public.box_beta_readiness AS
WITH advisor_stats AS (
  SELECT box_id,
         COUNT(*) FILTER (WHERE status='active') AS active_advisors,
         COALESCE(SUM(CASE WHEN status='active' AND accepting_requests THEN capacity ELSE 0 END), 0) AS total_capacity
  FROM public.box_advisors GROUP BY box_id
),
opp_stats AS (
  SELECT box_id,
         COUNT(*) FILTER (WHERE status IN ('open','active','published')) AS open_opportunities
  FROM public.opportunities WHERE box_id IS NOT NULL GROUP BY box_id
),
validated_idea_stats AS (
  SELECT o.box_id, COUNT(DISTINCT si.id) AS validated_ideas
  FROM public.opportunities o
  JOIN public.startup_ideas si ON si.id = o.source_entity_id
  WHERE o.source_entity_type='startup_idea' AND o.box_id IS NOT NULL AND si.validated_at IS NOT NULL
  GROUP BY o.box_id
),
ritual_stats AS (
  SELECT box_id,
         COUNT(*) FILTER (WHERE scheduled_at >= now() - interval '14 days') AS recent_rituals,
         COUNT(*) FILTER (WHERE scheduled_at >= now() AND status IN ('scheduled','planned','pending')) AS upcoming_rituals
  FROM public.ritual_instances WHERE box_id IS NOT NULL GROUP BY box_id
),
queue_stats AS (
  SELECT box_id,
         COUNT(*) FILTER (WHERE status IN ('pending','open','assigned') AND request_type='solution_signoff') AS pending_validations,
         COUNT(*) FILTER (WHERE status IN ('active','accepted')) AS active_advisor_load
  FROM public.box_inbound_requests GROUP BY box_id
),
alert_stats AS (
  SELECT subject_id::uuid AS box_id,
         COUNT(*) FILTER (WHERE severity IN ('critical','high')) AS critical_alerts
  FROM public.system_alerts WHERE subject_kind='box' AND subject_id ~* '^[0-9a-f]{8}-' GROUP BY subject_id::uuid
)
SELECT
  b.id AS box_id, b.slug, b.name,
  COALESCE(a.active_advisors,0) AS active_advisors,
  COALESCE(a.total_capacity,0) AS total_capacity,
  COALESCE(q.active_advisor_load,0) AS active_advisor_load,
  GREATEST(COALESCE(a.total_capacity,0)-COALESCE(q.active_advisor_load,0),0) AS capacity_available,
  COALESCE(o.open_opportunities,0) AS open_opportunities,
  COALESCE(v.validated_ideas,0) AS validated_ideas,
  COALESCE(r.recent_rituals,0) AS recent_rituals,
  COALESCE(r.upcoming_rituals,0) AS upcoming_rituals,
  COALESCE(q.pending_validations,0) AS pending_validations,
  COALESCE(al.critical_alerts,0) AS critical_alerts,
  (COALESCE(a.active_advisors,0)>=1) AS check_advisor,
  (COALESCE(o.open_opportunities,0)>=1) AS check_opportunity,
  (COALESCE(v.validated_ideas,0)>=1) AS check_validated_idea,
  ((COALESCE(r.recent_rituals,0)+COALESCE(r.upcoming_rituals,0))>=1) AS check_ritual,
  (COALESCE(al.critical_alerts,0)=0) AS check_no_critical_alerts,
  (COALESCE(q.pending_validations,0)<=5) AS check_validation_queue,
  (GREATEST(COALESCE(a.total_capacity,0)-COALESCE(q.active_advisor_load,0),0)>=1) AS check_capacity_available
FROM public.boxes b
LEFT JOIN advisor_stats a ON a.box_id=b.id
LEFT JOIN opp_stats o ON o.box_id=b.id
LEFT JOIN validated_idea_stats v ON v.box_id=b.id
LEFT JOIN ritual_stats r ON r.box_id=b.id
LEFT JOIN queue_stats q ON q.box_id=b.id
LEFT JOIN alert_stats al ON al.box_id=b.id;

GRANT SELECT ON public.box_beta_readiness TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_beta_readiness()
RETURNS TABLE (
  box_id uuid, slug text, name text,
  active_advisors int, total_capacity int, active_advisor_load int, capacity_available int,
  open_opportunities int, validated_ideas int, recent_rituals int, upcoming_rituals int,
  pending_validations int, critical_alerts int,
  check_advisor bool, check_opportunity bool, check_validated_idea bool,
  check_ritual bool, check_no_critical_alerts bool, check_validation_queue bool, check_capacity_available bool,
  checks_passed int, checks_total int, is_beta_ready bool
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT r.box_id, r.slug, r.name,
    r.active_advisors::int, r.total_capacity::int, r.active_advisor_load::int, r.capacity_available::int,
    r.open_opportunities::int, r.validated_ideas::int, r.recent_rituals::int, r.upcoming_rituals::int,
    r.pending_validations::int, r.critical_alerts::int,
    r.check_advisor, r.check_opportunity, r.check_validated_idea,
    r.check_ritual, r.check_no_critical_alerts, r.check_validation_queue, r.check_capacity_available,
    (r.check_advisor::int + r.check_opportunity::int + r.check_validated_idea::int +
     r.check_ritual::int + r.check_no_critical_alerts::int + r.check_validation_queue::int +
     r.check_capacity_available::int)::int AS checks_passed,
    7 AS checks_total,
    (r.check_advisor AND r.check_opportunity AND r.check_validated_idea AND r.check_ritual
     AND r.check_no_critical_alerts AND r.check_validation_queue AND r.check_capacity_available) AS is_beta_ready
  FROM public.box_beta_readiness r
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_beta_readiness() TO authenticated, service_role;
