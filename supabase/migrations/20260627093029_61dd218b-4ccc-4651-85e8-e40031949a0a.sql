
-- ============================================================
-- Sprint 5E — Unified activity_stream projection
-- ============================================================

-- Centralized importance classification — single source of truth
CREATE OR REPLACE FUNCTION public.activity_importance(_event_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _event_type
    -- HIGH
    WHEN 'milestone.achieved' THEN 'high'
    WHEN 'milestone_completed' THEN 'high'
    WHEN 'milestone_reached' THEN 'high'
    WHEN 'contribution.recorded' THEN 'high'
    WHEN 'opportunity.accepted' THEN 'high'
    WHEN 'idea_validation_approved' THEN 'high'
    WHEN 'idea.solution.validated' THEN 'high'
    WHEN 'certification_earned' THEN 'high'
    WHEN 'startup.team.joined' THEN 'high'
    WHEN 'startup_member_added' THEN 'high'
    WHEN 'venture_created' THEN 'high'
    WHEN 'company.incorporated' THEN 'high'
    -- MEDIUM
    WHEN 'commitment.completed' THEN 'medium'
    WHEN 'commitment.checkpoint.completed' THEN 'medium'
    WHEN 'relationship.formed' THEN 'medium'
    WHEN 'advisor_approved' THEN 'medium'
    WHEN 'box_request_accepted' THEN 'medium'
    WHEN 'application_accepted' THEN 'medium'
    WHEN 'opportunity.applied' THEN 'medium'
    WHEN 'opportunity.created' THEN 'medium'
    WHEN 'opportunity.matched' THEN 'medium'
    WHEN 'review_received' THEN 'medium'
    WHEN 'ritual.instance.completed' THEN 'medium'
    -- LOW
    WHEN 'commitment.created' THEN 'low'
    WHEN 'commitment.started' THEN 'low'
    WHEN 'box_request_created' THEN 'low'
    WHEN 'application_submitted' THEN 'low'
    WHEN 'opportunity.opened' THEN 'low'
    WHEN 'onboarding_completed' THEN 'low'
    WHEN 'skill_added' THEN 'low'
    ELSE 'ignore'
  END;
$$;

-- Human summary derived from payload — kept thin; surfaces refine if needed
CREATE OR REPLACE FUNCTION public.activity_summary(_event_type text, _payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    _payload->>'label',
    _payload->>'title',
    _payload->>'name',
    _payload->>'kind',
    replace(_event_type, '_', ' ')
  );
$$;

-- Public visibility rule: events on user-visible aggregates with non-ignore importance.
-- Profile/box/opportunity aggregates are treated as shareable; auth/admin signals are not.
CREATE OR REPLACE FUNCTION public.activity_visibility(_event_type text, _aggregate_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.activity_importance(_event_type) = 'ignore' THEN 'hidden'
    WHEN _event_type LIKE 'notification%' THEN 'private'
    WHEN _event_type LIKE 'admin%' THEN 'private'
    WHEN _event_type LIKE 'experiment%' THEN 'private'
    WHEN _event_type LIKE 'recommendation%' THEN 'private'
    WHEN _event_type LIKE 'draft%' THEN 'private'
    WHEN _event_type LIKE 'growth_loop%' THEN 'private'
    WHEN _event_type LIKE 'onboarding%' THEN 'private'
    WHEN _event_type LIKE 'cold_start%' THEN 'private'
    WHEN _event_type LIKE 'intent%' THEN 'private'
    ELSE 'public'
  END;
$$;

-- The projection itself: append-only, derived purely from graph_events.
CREATE OR REPLACE VIEW public.activity_stream AS
SELECT
  e.id                                                  AS event_id,
  e.occurred_at                                         AS occurred_at,
  e.user_id                                             AS actor_id,
  e.aggregate_type                                      AS primary_entity_type,
  e.aggregate_id                                        AS primary_entity_id,
  (e.payload->>'secondary_entity_type')                 AS secondary_entity_type,
  (e.payload->>'secondary_entity_id')                   AS secondary_entity_id,
  e.event_type::text                                    AS event_type,
  public.activity_importance(e.event_type::text)        AS importance,
  public.activity_visibility(e.event_type::text, e.aggregate_type) AS visibility,
  public.activity_summary(e.event_type::text, e.payload) AS summary,
  e.payload                                             AS metadata
FROM public.graph_events e
WHERE public.activity_importance(e.event_type::text) <> 'ignore';

GRANT SELECT ON public.activity_stream TO authenticated, service_role;

-- RPC: public-safe activity for a profile owner
CREATE OR REPLACE FUNCTION public.get_profile_activity(_user_id uuid, _limit int DEFAULT 30)
RETURNS TABLE (
  event_id uuid,
  occurred_at timestamptz,
  event_type text,
  importance text,
  summary text,
  primary_entity_type text,
  primary_entity_id text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.event_id, a.occurred_at, a.event_type, a.importance, a.summary,
         a.primary_entity_type, a.primary_entity_id, a.metadata
  FROM public.activity_stream a
  WHERE a.actor_id = _user_id
    AND a.visibility = 'public'
  ORDER BY a.occurred_at DESC
  LIMIT GREATEST(LEAST(_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_activity(uuid, int) TO authenticated, anon;

-- RPC: box activity (admin-readable for now; opens up to box members later)
CREATE OR REPLACE FUNCTION public.get_box_activity(_box_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (
  event_id uuid,
  occurred_at timestamptz,
  actor_id uuid,
  event_type text,
  importance text,
  summary text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.event_id, a.occurred_at, a.actor_id, a.event_type, a.importance, a.summary, a.metadata
  FROM public.activity_stream a
  WHERE (a.metadata->>'box_id')::uuid = _box_id
    AND a.visibility = 'public'
  ORDER BY a.occurred_at DESC
  LIMIT GREATEST(LEAST(_limit, 200), 1);
$$;
GRANT EXECUTE ON FUNCTION public.get_box_activity(uuid, int) TO authenticated;

-- RPC: global activity (admin only)
CREATE OR REPLACE FUNCTION public.get_global_activity(_min_importance text DEFAULT 'medium', _limit int DEFAULT 100)
RETURNS TABLE (
  event_id uuid,
  occurred_at timestamptz,
  actor_id uuid,
  event_type text,
  importance text,
  summary text,
  primary_entity_type text,
  primary_entity_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT a.event_id, a.occurred_at, a.actor_id, a.event_type, a.importance, a.summary,
           a.primary_entity_type, a.primary_entity_id
    FROM public.activity_stream a
    WHERE a.visibility <> 'hidden'
      AND CASE _min_importance
        WHEN 'high' THEN a.importance = 'high'
        WHEN 'medium' THEN a.importance IN ('high','medium')
        ELSE TRUE
      END
    ORDER BY a.occurred_at DESC
    LIMIT GREATEST(LEAST(_limit, 500), 1);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_global_activity(text, int) TO authenticated;

-- ============================================================
-- Sprint 5F — Ecosystem operations metrics
-- Grouped: supply / demand / conversion / health / risk
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ops_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_active_advisors int;
  v_open_opps int;
  v_advisor_capacity int;
  v_requests int;
  v_applications int;
  v_new_commitments int;
  v_req_to_rel numeric;
  v_opp_accept numeric;
  v_commit_complete numeric;
  v_contrib_milestone numeric;
  v_median_response interval;
  v_relationship_continuity numeric;
  v_verified_contribs int;
  v_opp_fill numeric;
  v_unanswered_requests int;
  v_stale_rels int;
  v_unvalidated_ideas int;
  v_full_advisors int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- SUPPLY
  SELECT count(*) INTO v_active_advisors
    FROM public.box_advisors WHERE status = 'active';
  SELECT count(*) INTO v_open_opps
    FROM public.opportunities WHERE status IN ('open','published');
  SELECT COALESCE(sum(GREATEST(capacity - active_load, 0)), 0)::int INTO v_advisor_capacity
    FROM public.advisor_metrics;

  -- DEMAND (last 30d)
  SELECT count(*) INTO v_requests
    FROM public.box_inbound_requests WHERE created_at > now() - interval '30 days';
  SELECT count(*) INTO v_applications
    FROM public.opportunity_applications WHERE created_at > now() - interval '30 days';
  SELECT count(*) INTO v_new_commitments
    FROM public.commitments WHERE created_at > now() - interval '30 days';

  -- CONVERSION (last 90d)
  SELECT COALESCE(
    avg(CASE WHEN status IN ('accepted','completed') THEN 1.0 ELSE 0.0 END) * 100, 0
  )::numeric(5,1) INTO v_req_to_rel
    FROM public.box_inbound_requests WHERE created_at > now() - interval '90 days';

  SELECT COALESCE(
    avg(CASE WHEN status = 'accepted' THEN 1.0 ELSE 0.0 END) * 100, 0
  )::numeric(5,1) INTO v_opp_accept
    FROM public.opportunity_applications WHERE created_at > now() - interval '90 days';

  SELECT COALESCE(
    avg(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100, 0
  )::numeric(5,1) INTO v_commit_complete
    FROM public.commitments WHERE created_at > now() - interval '90 days';

  SELECT CASE WHEN count(c.*) = 0 THEN 0
    ELSE (count(m.*)::numeric / count(c.*) * 100)::numeric(5,1) END
  INTO v_contrib_milestone
  FROM public.contributions c
  LEFT JOIN public.milestones m ON m.created_at >= c.created_at
  WHERE c.created_at > now() - interval '90 days';

  -- HEALTH
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (responded_at - created_at))
  INTO v_median_response
  FROM public.box_inbound_requests
  WHERE responded_at IS NOT NULL AND created_at > now() - interval '90 days';

  SELECT COALESCE(avg(health_score), 0)::numeric(5,1)
  INTO v_relationship_continuity
  FROM public.relationship_health;

  SELECT count(DISTINCT user_id) INTO v_verified_contribs
  FROM public.contributions
  WHERE verified_at IS NOT NULL AND created_at > now() - interval '30 days';

  SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE (count(*) FILTER (WHERE status IN ('accepted','closed'))::numeric / count(*) * 100)::numeric(5,1) END
  INTO v_opp_fill
  FROM public.opportunities WHERE created_at > now() - interval '90 days';

  -- RISK
  SELECT count(*) INTO v_unanswered_requests
  FROM public.box_inbound_requests
  WHERE status IN ('pending','new') AND created_at < now() - interval '7 days';

  SELECT count(*) INTO v_stale_rels
  FROM public.relationship_health WHERE last_interaction_at < now() - interval '30 days';

  SELECT count(*) INTO v_unvalidated_ideas
  FROM public.startup_ideas WHERE created_at < now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.idea_solution_canvas c
      WHERE c.idea_id = startup_ideas.id AND c.validated_at IS NOT NULL
    );

  SELECT count(*) INTO v_full_advisors
  FROM public.advisor_metrics WHERE active_load >= capacity;

  result := jsonb_build_object(
    'generated_at', now(),
    'supply', jsonb_build_object(
      'active_advisors', v_active_advisors,
      'open_opportunities', v_open_opps,
      'available_capacity', v_advisor_capacity
    ),
    'demand', jsonb_build_object(
      'requests_30d', v_requests,
      'applications_30d', v_applications,
      'new_commitments_30d', v_new_commitments
    ),
    'conversion', jsonb_build_object(
      'request_to_relationship_pct', v_req_to_rel,
      'opportunity_accept_pct', v_opp_accept,
      'commitment_complete_pct', v_commit_complete,
      'contribution_to_milestone_pct', v_contrib_milestone
    ),
    'health', jsonb_build_object(
      'median_response_seconds', EXTRACT(EPOCH FROM v_median_response),
      'relationship_continuity', v_relationship_continuity,
      'verified_contributors_30d', v_verified_contribs,
      'opportunity_fill_pct', v_opp_fill
    ),
    'risk', jsonb_build_object(
      'unanswered_requests', v_unanswered_requests,
      'stale_relationships', v_stale_rels,
      'unvalidated_ideas', v_unvalidated_ideas,
      'full_advisors', v_full_advisors
    )
  );

  RETURN result;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  -- Defensive: if any optional table column is missing, return partial.
  RETURN jsonb_build_object('error', SQLERRM, 'generated_at', now());
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ops_metrics() TO authenticated;
