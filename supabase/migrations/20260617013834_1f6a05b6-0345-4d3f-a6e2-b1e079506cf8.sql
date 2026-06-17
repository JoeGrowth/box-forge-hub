
CREATE OR REPLACE FUNCTION public.compute_user_state_scores(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exp_raw      numeric := 0;
  v_verified     int     := 0;
  v_trust_raw    numeric := 0;
  v_tx           int     := 0;
  v_revenue      numeric := 0;
  v_own          numeric := 0;
  v_ventures     int     := 0;
  v_consulting   int     := 0;
  v_learning     int     := 0;
  v_intent       int     := 0;
  v_apps         int     := 0;
  v_cold_conf    numeric := 0;
  v_user_node    uuid;

  v_n_exp        numeric;
  v_n_trust      numeric;
  v_n_revenue    numeric;
  v_n_ownership  numeric;
  v_n_activity   numeric;

  r record;
  scores jsonb := '[]'::jsonb;
  qualifying text[] := ARRAY['explorer'];
  best_state text;
  best_sort  int;
  runner_state text;
  reasons jsonb := '[]'::jsonb;
  missing jsonb := '[]'::jsonb;
  next_state text;
BEGIN
  SELECT COALESCE(expertise_score,0), COALESCE(verified_expertise_count,0)
    INTO v_exp_raw, v_verified
    FROM public.expertise_graph WHERE user_id = _user_id;
  SELECT COALESCE(trust_score,0) INTO v_trust_raw
    FROM public.trust_graph WHERE user_id = _user_id;
  SELECT COALESCE(completed_value_count,0), COALESCE(total_revenue,0)
    INTO v_tx, v_revenue
    FROM public.revenue_graph WHERE user_id = _user_id;
  SELECT COALESCE(total_allocated_equity,0), COALESCE(venture_count,0)
    INTO v_own, v_ventures
    FROM public.ownership_graph WHERE user_id = _user_id;
  SELECT COALESCE(confidence,0) INTO v_cold_conf
    FROM public.cold_start_profiles WHERE user_id = _user_id;

  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);
  SELECT COUNT(*) INTO v_consulting FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';

  SELECT COUNT(*) INTO v_learning FROM public.graph_events
    WHERE user_id = _user_id AND event_type IN ('certification_earned','certification_verified','skill_added','journey_completed','milestone_completed');
  SELECT COUNT(*) INTO v_intent   FROM public.graph_events
    WHERE user_id = _user_id AND event_type IN ('intent_declared','intent_signal_recorded','goal_created','onboarding_completed','cold_start_confirmed','cold_start_seeded');
  SELECT COUNT(*) INTO v_apps     FROM public.graph_events
    WHERE user_id = _user_id AND event_type IN ('user_applied_opportunity','application_submitted','user_saved_opportunity','user_viewed_opportunity');

  -- Normalized 0..100 evidence levels for the UI / scoring.
  v_n_exp       := LEAST(100, GREATEST(v_exp_raw*3, v_verified*20));
  v_n_trust     := LEAST(100, GREATEST(v_trust_raw, v_verified*25));
  v_n_revenue   := CASE
                     WHEN v_revenue >= 500 OR v_consulting >= 1
                       THEN LEAST(100, 40 + v_tx*5 + LEAST(50, v_revenue/200))
                     WHEN v_tx >= 1 AND v_revenue > 0
                       THEN LEAST(100, 30 + v_tx*5)
                     ELSE 0
                   END;
  v_n_ownership := LEAST(100, v_own * 5);
  v_n_activity  := LEAST(100,
                     v_learning*15 + v_intent*10 + v_apps*5
                     + LEAST(40, v_verified*10)
                     + ROUND(v_cold_conf*30));

  -- ----------------------------------------------------------------
  -- Precedence ladder. A state is qualifying when its evidence floor
  -- is met. The derived state is the most advanced qualifying state.
  -- ----------------------------------------------------------------
  IF v_cold_conf >= 0.6 OR v_verified >= 1 OR v_exp_raw >= 10 OR v_learning >= 1 OR v_apps >= 3 THEN
    qualifying := qualifying || 'builder';
  END IF;
  IF v_verified >= 2
     OR (v_verified >= 1 AND v_trust_raw >= 20)
     OR v_trust_raw >= 50 THEN
    qualifying := qualifying || 'validated_expert';
  END IF;
  IF v_revenue >= 500
     OR v_consulting >= 1
     OR (v_tx >= 1 AND v_revenue > 0) THEN
    qualifying := qualifying || 'professional_operator';
  END IF;
  IF v_own > 0 THEN
    qualifying := qualifying || 'co_builder';
  END IF;
  IF v_ventures >= 1 AND v_own >= 15 THEN
    qualifying := qualifying || 'venture_creator';
  END IF;

  -- Compute exposable scores for every state (raw weighted sum, /100).
  FOR r IN SELECT * FROM public.professional_state_weights ORDER BY sort_order
  LOOP
    DECLARE s numeric;
            gated boolean := NOT (r.state = ANY(qualifying));
    BEGIN
      s := (v_n_exp*r.weight_expertise + v_n_trust*r.weight_trust
          + v_n_revenue*r.weight_revenue + v_n_ownership*r.weight_ownership
          + v_n_activity*r.weight_activity) / 100.0;
      scores := scores || jsonb_build_object(
        'state', r.state, 'score', ROUND(s,2), 'eligible', NOT gated
      );
    END;
  END LOOP;

  -- Derived state = highest sort_order among qualifying states.
  SELECT state, sort_order INTO best_state, best_sort
    FROM public.professional_state_weights
   WHERE state = ANY(qualifying)
   ORDER BY sort_order DESC LIMIT 1;

  -- Next state above the current one (target for progression).
  SELECT state INTO next_state
    FROM public.professional_state_weights
   WHERE sort_order > best_sort
   ORDER BY sort_order ASC LIMIT 1;

  -- Runner up = second-best qualifying, otherwise the next target.
  SELECT state INTO runner_state
    FROM public.professional_state_weights
   WHERE state = ANY(qualifying) AND state <> best_state
   ORDER BY sort_order DESC LIMIT 1;
  IF runner_state IS NULL THEN runner_state := next_state; END IF;

  -- Reasons supporting the winning state
  IF v_verified >= 1     THEN reasons := reasons || jsonb_build_array(format('%s verified certification(s)', v_verified)); END IF;
  IF v_exp_raw  >= 5     THEN reasons := reasons || jsonb_build_array(format('Expertise score %s', ROUND(v_exp_raw,0))); END IF;
  IF v_trust_raw>= 20    THEN reasons := reasons || jsonb_build_array(format('Trust score %s', ROUND(v_trust_raw,0))); END IF;
  IF v_tx       >= 1 AND v_revenue > 0
                         THEN reasons := reasons || jsonb_build_array(format('%s completed engagement(s)', v_tx)); END IF;
  IF v_revenue  >= 500   THEN reasons := reasons || jsonb_build_array(format('Revenue $%s recorded', ROUND(v_revenue,0))); END IF;
  IF v_own      >  0     THEN reasons := reasons || jsonb_build_array(format('%s%% allocated equity', ROUND(v_own,1))); END IF;
  IF v_ventures >= 1     THEN reasons := reasons || jsonb_build_array(format('%s active venture(s)', v_ventures)); END IF;
  IF v_cold_conf>= 0.6   THEN reasons := reasons || jsonb_build_array(format('Confirmed cold-start intent (%s)', ROUND(v_cold_conf,2))); END IF;
  IF v_learning >  0     THEN reasons := reasons || jsonb_build_array(format('%s learning event(s)', v_learning)); END IF;

  -- Missing signals to reach the NEXT state in the ladder.
  IF next_state IS NOT NULL THEN
    CASE next_state
      WHEN 'builder' THEN
        missing := missing || jsonb_build_array('Confirm your direction (cold-start, learning event, or first application)');
      WHEN 'validated_expert' THEN
        IF v_verified < 2 THEN missing := missing || jsonb_build_array('Add another verified certification'); END IF;
        IF v_trust_raw < 20 THEN missing := missing || jsonb_build_array('Earn trust signals (verified profile, reviews)'); END IF;
      WHEN 'professional_operator' THEN
        IF v_tx = 0 THEN missing := missing || jsonb_build_array('Complete first client engagement'); END IF;
        IF v_revenue = 0 AND v_consulting = 0 THEN missing := missing || jsonb_build_array('Record revenue or a consulting outcome'); END IF;
      WHEN 'co_builder' THEN
        missing := missing || jsonb_build_array('Receive an equity allocation in a venture');
      WHEN 'venture_creator' THEN
        IF v_ventures < 1 THEN missing := missing || jsonb_build_array('Launch a venture'); END IF;
        IF v_own < 15 THEN missing := missing || jsonb_build_array('Reach at least 15% founder equity'); END IF;
      ELSE NULL;
    END CASE;
  END IF;

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'derived_state', best_state,
    'qualifying_states', to_jsonb(qualifying),
    'next_state', next_state,
    'runner_up', runner_state,
    'reasons', reasons,
    'missing_for_next', missing,
    'signals', jsonb_build_object(
      'expertise', ROUND(v_n_exp,1), 'trust', ROUND(v_n_trust,1),
      'revenue', ROUND(v_n_revenue,1), 'ownership', ROUND(v_n_ownership,1),
      'activity', ROUND(v_n_activity,1),
      'raw', jsonb_build_object(
        'expertise_score', v_exp_raw, 'verified_count', v_verified,
        'trust_score', v_trust_raw, 'transactions', v_tx, 'revenue', v_revenue,
        'equity', v_own, 'ventures', v_ventures, 'consulting', v_consulting,
        'learning', v_learning, 'intent', v_intent, 'applications', v_apps,
        'cold_confidence', v_cold_conf)
    ),
    'scores', scores
  );
END
$$;

-- Refresh the audit view payload references.
DROP VIEW IF EXISTS public.beta_state_classification_audit;
CREATE VIEW public.beta_state_classification_audit
WITH (security_invoker = true) AS
SELECT
  p.id                                                AS user_id,
  p.full_name,
  (s.payload ->> 'derived_state')                     AS derived_state,
  (s.payload ->> 'next_state')                        AS next_state,
  (s.payload ->> 'runner_up')                         AS runner_up,
  s.payload -> 'qualifying_states'                    AS qualifying_states,
  s.payload -> 'reasons'                              AS reasons,
  s.payload -> 'missing_for_next'                     AS missing,
  s.payload -> 'signals'                              AS signals,
  s.payload -> 'scores'                               AS scores
FROM public.profiles p
CROSS JOIN LATERAL (SELECT public.compute_user_state_scores(p.id) AS payload) s;

GRANT SELECT ON public.beta_state_classification_audit TO authenticated, service_role;
