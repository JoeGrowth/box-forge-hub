
CREATE OR REPLACE FUNCTION public.get_ops_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_survival_30 numeric := 0; v_survival_60 numeric := 0; v_survival_90 numeric := 0;
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
  FROM public.contributions c LEFT JOIN public.milestones m ON m.created_at >= c.created_at
  WHERE c.created_at > now() - interval '90 days';

  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (COALESCE(accepted_at, assigned_at) - created_at))
  INTO v_median_response FROM public.box_inbound_requests
  WHERE COALESCE(accepted_at, assigned_at) IS NOT NULL AND created_at > now() - interval '90 days';
  SELECT COALESCE(avg(health_score), 0)::numeric(5,1) INTO v_relationship_continuity FROM public.relationship_health;
  SELECT count(DISTINCT actor_id) INTO v_verified_contribs FROM public.contributions
    WHERE created_at > now() - interval '30 days';
  SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE (count(*) FILTER (WHERE status IN ('accepted','closed'))::numeric / count(*) * 100)::numeric(5,1) END
  INTO v_opp_fill FROM public.opportunities WHERE created_at > now() - interval '90 days';

  SELECT count(*) INTO v_unanswered_requests FROM public.box_inbound_requests
    WHERE status IN ('pending','new','requested') AND created_at < now() - interval '7 days';
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
    ON (c.actor_id = r.advisor_id OR c.actor_id = r.founder_id)
   AND c.created_at >= r.created_at
  WHERE r.created_at > now() - interval '90 days';

  SELECT EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY first_c - r.created_at))::numeric
  INTO v_median_rel_to_contrib_sec
  FROM public.advisor_relationships r
  CROSS JOIN LATERAL (
    SELECT min(c.created_at) AS first_c FROM public.contributions c
    WHERE (c.actor_id = r.advisor_id OR c.actor_id = r.founder_id) AND c.created_at >= r.created_at
  ) fc
  WHERE first_c IS NOT NULL AND r.created_at > now() - interval '180 days';

  SELECT EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY first_o - first_c))::numeric
  INTO v_median_contrib_to_opp_sec
  FROM (SELECT c.actor_id AS uid, min(c.created_at) AS first_c FROM public.contributions c GROUP BY c.actor_id) cu
  JOIN (SELECT a.applicant_id AS uid, min(a.created_at) AS first_o FROM public.opportunity_applications a GROUP BY a.applicant_id) ou USING (uid);

  SELECT COALESCE(avg(contrib_count), 0)::numeric(6,2) INTO v_advisor_effectiveness
  FROM (
    SELECT r.advisor_id, count(DISTINCT c.actor_id) AS contrib_count
    FROM public.advisor_relationships r
    LEFT JOIN public.contributions c ON c.actor_id = r.founder_id AND c.created_at >= r.created_at
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
$function$;
