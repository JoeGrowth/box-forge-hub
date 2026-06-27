
CREATE OR REPLACE VIEW public.funnel_progress AS
WITH milestones_per_user AS (
  SELECT
    p.user_id,
    p.created_at AS signup_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text = 'onboarding_completed') AS onboarded_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text = 'activation_hub_viewed') AS activated_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text = 'relationship.formed') AS first_relationship_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text IN ('commitment.created','commitment.started')) AS first_commitment_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text = 'contribution.recorded') AS first_contribution_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text IN ('milestone.achieved','milestone_completed','milestone_reached')) AS first_milestone_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text IN ('opportunity.applied','opportunity_interested','user_applied_opportunity')) AS first_opportunity_at,
    (SELECT min(occurred_at) FROM public.graph_events e
       WHERE e.user_id = p.user_id AND e.event_type::text IN ('opportunity.accepted','application_accepted')) AS accepted_opportunity_at,
    (SELECT count(*) FROM public.graph_events e
       WHERE e.user_id = p.user_id
         AND e.event_type::text = 'contribution.recorded'
         AND e.occurred_at > now() - interval '30 days') AS contribs_last_30d
  FROM public.profiles p
)
SELECT user_id, signup_at, onboarded_at, activated_at, first_relationship_at,
  first_commitment_at, first_contribution_at, first_milestone_at,
  first_opportunity_at, accepted_opportunity_at, contribs_last_30d,
  CASE
    WHEN contribs_last_30d >= 1 AND signup_at < now() - interval '30 days' THEN 'retained_30d'
    WHEN accepted_opportunity_at IS NOT NULL THEN 'accepted_opportunity'
    WHEN first_opportunity_at IS NOT NULL THEN 'first_opportunity'
    WHEN first_milestone_at IS NOT NULL THEN 'first_milestone'
    WHEN first_contribution_at IS NOT NULL THEN 'first_contribution'
    WHEN first_commitment_at IS NOT NULL THEN 'first_commitment'
    WHEN first_relationship_at IS NOT NULL THEN 'first_relationship'
    WHEN activated_at IS NOT NULL THEN 'activated'
    WHEN onboarded_at IS NOT NULL THEN 'onboarded'
    ELSE 'signup'
  END AS stage,
  CASE
    WHEN contribs_last_30d >= 1 AND signup_at < now() - interval '30 days' THEN 10
    WHEN accepted_opportunity_at IS NOT NULL THEN 9
    WHEN first_opportunity_at IS NOT NULL THEN 8
    WHEN first_milestone_at IS NOT NULL THEN 7
    WHEN first_contribution_at IS NOT NULL THEN 6
    WHEN first_commitment_at IS NOT NULL THEN 5
    WHEN first_relationship_at IS NOT NULL THEN 4
    WHEN activated_at IS NOT NULL THEN 3
    WHEN onboarded_at IS NOT NULL THEN 2
    ELSE 1
  END AS stage_rank
FROM milestones_per_user;

GRANT SELECT ON public.funnel_progress TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_ops_metrics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_active_advisors int; v_open_opps int; v_advisor_capacity int;
  v_requests int; v_applications int; v_new_commitments int;
  v_req_to_rel numeric; v_opp_accept numeric; v_commit_complete numeric; v_contrib_milestone numeric;
  v_median_response interval; v_relationship_continuity numeric;
  v_verified_contribs int; v_opp_fill numeric;
  v_unanswered_requests int; v_stale_rels int; v_unvalidated_ideas int; v_full_advisors int;
  v_contribs_per_rel numeric;
  v_median_rel_to_contrib_sec numeric;
  v_median_contrib_to_opp_sec numeric;
  v_survival_30 numeric; v_survival_60 numeric; v_survival_90 numeric;
  v_advisor_effectiveness numeric;
  v_funnel jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*) INTO v_active_advisors FROM public.box_advisors WHERE status = 'active';
  SELECT count(*) INTO v_open_opps FROM public.opportunities WHERE status IN ('open','published');
  SELECT COALESCE(sum(capacity), 0)::int INTO v_advisor_capacity
    FROM public.box_advisors WHERE status = 'active' AND accepting_requests = true;

  SELECT count(*) INTO v_requests FROM public.box_inbound_requests WHERE created_at > now() - interval '30 days';
  SELECT count(*) INTO v_applications FROM public.opportunity_applications WHERE created_at > now() - interval '30 days';
  SELECT count(*) INTO v_new_commitments FROM public.commitments WHERE created_at > now() - interval '30 days';

  SELECT COALESCE(avg(CASE WHEN status IN ('accepted','completed') THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1)
    INTO v_req_to_rel FROM public.box_inbound_requests WHERE created_at > now() - interval '90 days';
  SELECT COALESCE(avg(CASE WHEN status = 'accepted' THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1)
    INTO v_opp_accept FROM public.opportunity_applications WHERE created_at > now() - interval '90 days';
  SELECT COALESCE(avg(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1)
    INTO v_commit_complete FROM public.commitments WHERE created_at > now() - interval '90 days';
  SELECT CASE WHEN count(c.*) = 0 THEN 0 ELSE (count(m.*)::numeric / count(c.*) * 100)::numeric(5,1) END
  INTO v_contrib_milestone
  FROM public.contributions c
  LEFT JOIN public.milestones m ON m.created_at >= c.created_at
  WHERE c.created_at > now() - interval '90 days';

  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (responded_at - created_at))
  INTO v_median_response FROM public.box_inbound_requests
  WHERE responded_at IS NOT NULL AND created_at > now() - interval '90 days';
  SELECT COALESCE(avg(health_score), 0)::numeric(5,1) INTO v_relationship_continuity FROM public.relationship_health;
  SELECT count(DISTINCT user_id) INTO v_verified_contribs FROM public.contributions
    WHERE verified_at IS NOT NULL AND created_at > now() - interval '30 days';
  SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE (count(*) FILTER (WHERE status IN ('accepted','closed'))::numeric / count(*) * 100)::numeric(5,1) END
  INTO v_opp_fill FROM public.opportunities WHERE created_at > now() - interval '90 days';

  SELECT count(*) INTO v_unanswered_requests FROM public.box_inbound_requests
    WHERE status IN ('pending','new') AND created_at < now() - interval '7 days';
  SELECT count(*) INTO v_stale_rels FROM public.relationship_health WHERE last_interaction_at < now() - interval '30 days';
  SELECT count(*) INTO v_unvalidated_ideas FROM public.startup_ideas
    WHERE created_at < now() - interval '30 days' AND validated_at IS NULL;
  SELECT count(*) INTO v_full_advisors FROM public.box_advisors
    WHERE status = 'active' AND accepting_requests = false;

  SELECT CASE WHEN count(DISTINCT r.id) = 0 THEN 0
              ELSE (count(c.*)::numeric / count(DISTINCT r.id))::numeric(6,2) END
  INTO v_contribs_per_rel
  FROM public.advisor_relationships r
  LEFT JOIN public.contributions c
    ON (c.user_id = r.advisor_id OR c.user_id = r.founder_id)
   AND c.created_at >= r.created_at
  WHERE r.created_at > now() - interval '90 days';

  SELECT EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY first_c - r.created_at))::numeric
  INTO v_median_rel_to_contrib_sec
  FROM public.advisor_relationships r
  CROSS JOIN LATERAL (
    SELECT min(c.created_at) AS first_c FROM public.contributions c
    WHERE (c.user_id = r.advisor_id OR c.user_id = r.founder_id) AND c.created_at >= r.created_at
  ) fc
  WHERE first_c IS NOT NULL AND r.created_at > now() - interval '180 days';

  SELECT EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY first_o - first_c))::numeric
  INTO v_median_contrib_to_opp_sec
  FROM (SELECT c.user_id, min(c.created_at) AS first_c FROM public.contributions c GROUP BY c.user_id) cu
  JOIN (SELECT a.user_id, min(a.created_at) AS first_o FROM public.opportunity_applications a GROUP BY a.user_id) ou USING (user_id)
  WHERE first_o >= first_c;

  SELECT
    COALESCE(avg(CASE WHEN created_at < now() - interval '30 days' AND (status='active' OR status IS NULL) THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1),
    COALESCE(avg(CASE WHEN created_at < now() - interval '60 days' AND (status='active' OR status IS NULL) THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1),
    COALESCE(avg(CASE WHEN created_at < now() - interval '90 days' AND (status='active' OR status IS NULL) THEN 1.0 ELSE 0.0 END) * 100, 0)::numeric(5,1)
  INTO v_survival_30, v_survival_60, v_survival_90
  FROM public.advisor_relationships;

  SELECT COALESCE(avg(contrib_count), 0)::numeric(6,2) INTO v_advisor_effectiveness
  FROM (
    SELECT r.advisor_id, count(DISTINCT c.user_id) FILTER (WHERE c.verified_at IS NOT NULL) AS contrib_count
    FROM public.advisor_relationships r
    LEFT JOIN public.contributions c ON c.user_id = r.founder_id AND c.created_at >= r.created_at
    WHERE r.created_at > now() - interval '90 days'
    GROUP BY r.advisor_id
  ) ae;

  SELECT jsonb_object_agg(stage, n) INTO v_funnel
  FROM (SELECT stage, count(*) AS n FROM public.funnel_progress GROUP BY stage) f;

  result := jsonb_build_object(
    'generated_at', now(),
    'supply', jsonb_build_object('active_advisors', v_active_advisors,'open_opportunities', v_open_opps,'available_capacity', v_advisor_capacity),
    'demand', jsonb_build_object('requests_30d', v_requests,'applications_30d', v_applications,'new_commitments_30d', v_new_commitments),
    'conversion', jsonb_build_object('request_to_relationship_pct', v_req_to_rel,'opportunity_accept_pct', v_opp_accept,'commitment_complete_pct', v_commit_complete,'contribution_to_milestone_pct', v_contrib_milestone),
    'health', jsonb_build_object('median_response_seconds', EXTRACT(EPOCH FROM v_median_response),'relationship_continuity', v_relationship_continuity,'verified_contributors_30d', v_verified_contribs,'opportunity_fill_pct', v_opp_fill),
    'risk', jsonb_build_object('unanswered_requests', v_unanswered_requests,'stale_relationships', v_stale_rels,'unvalidated_ideas', v_unvalidated_ideas,'full_advisors', v_full_advisors),
    'quality', jsonb_build_object(
      'contributions_per_relationship', v_contribs_per_rel,
      'median_rel_to_contribution_seconds', v_median_rel_to_contrib_sec,
      'median_contribution_to_opportunity_seconds', v_median_contrib_to_opp_sec,
      'relationship_survival_30d_pct', v_survival_30,
      'relationship_survival_60d_pct', v_survival_60,
      'relationship_survival_90d_pct', v_survival_90,
      'advisor_effectiveness_verified_contribs', v_advisor_effectiveness),
    'funnel', COALESCE(v_funnel, '{}'::jsonb)
  );
  RETURN result;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN jsonb_build_object('error', SQLERRM, 'generated_at', now());
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ops_metrics() TO authenticated;

CREATE OR REPLACE VIEW public.system_alerts AS
SELECT 'advisor_at_capacity'::text AS code, 'high'::text AS severity,
  ba.user_id::text AS subject_id, 'advisor'::text AS subject_kind,
  format('Advisor not accepting requests (cap %s)', ba.capacity) AS message,
  ba.updated_at AS detected_at
FROM public.box_advisors ba
WHERE ba.status = 'active' AND ba.accepting_requests = false
UNION ALL
SELECT 'opportunity_no_applicants','medium', o.id::text, 'opportunity',
  format('Opportunity "%s" has no applicants after 7 days', COALESCE(o.title, o.id::text)), o.created_at
FROM public.opportunities o
WHERE o.created_at < now() - interval '7 days' AND o.status IN ('open','published')
  AND NOT EXISTS (SELECT 1 FROM public.opportunity_applications a WHERE a.opportunity_id = o.id)
UNION ALL
SELECT 'relationship_stale','medium', rh.relationship_id::text, 'relationship',
  format('Relationship inactive for %s days', EXTRACT(DAY FROM now() - rh.last_interaction_at)::int),
  rh.last_interaction_at
FROM public.relationship_health rh
WHERE rh.last_interaction_at < now() - interval '30 days'
UNION ALL
SELECT 'commitment_overdue','high', c.id::text, 'commitment',
  format('Commitment "%s" overdue', COALESCE(c.title, c.id::text)), c.due_at
FROM public.commitments c
WHERE c.status NOT IN ('completed','cancelled','failed')
  AND c.due_at IS NOT NULL AND c.due_at < now()
UNION ALL
SELECT 'box_no_active_advisor','high', b.id::text, 'box',
  format('Box "%s" has no active advisor', b.name), now()
FROM public.boxes b
WHERE NOT EXISTS (SELECT 1 FROM public.box_advisors ba WHERE ba.box_id = b.id AND ba.status = 'active')
UNION ALL
SELECT 'validation_queue_backlog','medium', si.id::text, 'idea',
  format('Idea "%s" awaiting validation %s days', COALESCE(si.title, si.id::text), EXTRACT(DAY FROM now() - si.created_at)::int),
  si.created_at
FROM public.startup_ideas si
WHERE si.created_at < now() - interval '14 days' AND si.validated_at IS NULL;

GRANT SELECT ON public.system_alerts TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_system_alerts()
RETURNS SETOF public.system_alerts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.system_alerts
    ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, detected_at DESC
    LIMIT 200;
EXCEPTION WHEN undefined_table OR undefined_column THEN RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_system_alerts() TO authenticated;
