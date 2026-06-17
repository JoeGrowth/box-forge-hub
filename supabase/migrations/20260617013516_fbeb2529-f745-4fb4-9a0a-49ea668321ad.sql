
-- ============================================================
-- 1. Weight matrix (declarative & tunable without code deploys)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.professional_state_weights (
  state              text PRIMARY KEY,
  weight_expertise   numeric NOT NULL DEFAULT 0,
  weight_trust       numeric NOT NULL DEFAULT 0,
  weight_revenue     numeric NOT NULL DEFAULT 0,
  weight_ownership   numeric NOT NULL DEFAULT 0,
  weight_activity    numeric NOT NULL DEFAULT 0,
  min_ownership      numeric NOT NULL DEFAULT 0,   -- hard gate (equity %)
  min_ventures       int     NOT NULL DEFAULT 0,   -- hard gate
  sort_order         int     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.professional_state_weights TO authenticated, anon;
GRANT ALL    ON public.professional_state_weights TO service_role;
ALTER TABLE public.professional_state_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "state weights readable by all" ON public.professional_state_weights;
CREATE POLICY "state weights readable by all"
  ON public.professional_state_weights FOR SELECT USING (true);

INSERT INTO public.professional_state_weights
  (state, weight_expertise, weight_trust, weight_revenue, weight_ownership, weight_activity, min_ownership, min_ventures, sort_order)
VALUES
  ('explorer',          10,  0,  0,   0,  0,  0,  0, 1),
  ('builder',           30, 10,  0,   0, 20,  0,  0, 2),
  ('validated_expert',  40, 30,  0,   0, 30,  0,  0, 3),
  ('professional_operator', 40, 40, 30, 0, 50, 0, 0, 4),
  ('co_builder',        40, 40, 20,  50, 40,  0.01, 0, 5),
  ('venture_creator',   30, 30, 20,  80, 50, 15, 1, 6)
ON CONFLICT (state) DO UPDATE SET
  weight_expertise = EXCLUDED.weight_expertise,
  weight_trust     = EXCLUDED.weight_trust,
  weight_revenue   = EXCLUDED.weight_revenue,
  weight_ownership = EXCLUDED.weight_ownership,
  weight_activity  = EXCLUDED.weight_activity,
  min_ownership    = EXCLUDED.min_ownership,
  min_ventures     = EXCLUDED.min_ventures,
  sort_order       = EXCLUDED.sort_order,
  updated_at       = now();

-- ============================================================
-- 2. Scoring function (relative, explainable)
-- ============================================================
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
  v_user_node    uuid;

  -- normalized 0..100 evidence levels
  v_n_exp        numeric;
  v_n_trust      numeric;
  v_n_revenue    numeric;
  v_n_ownership  numeric;
  v_n_activity   numeric;

  r record;
  scores jsonb := '[]'::jsonb;
  best_state text; best_score numeric := -1;
  runner_state text; runner_score numeric := -1;
  reasons jsonb;
  missing jsonb;
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

  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);
  SELECT COUNT(*) INTO v_consulting FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';

  SELECT COUNT(*) INTO v_learning  FROM public.graph_events
    WHERE user_id = _user_id AND event_type IN ('learning_progressed','assessment_completed','certification_earned');
  SELECT COUNT(*) INTO v_intent    FROM public.graph_events
    WHERE user_id = _user_id AND event_type IN ('intent_declared','goal_set','onboarding_completed');
  SELECT COUNT(*) INTO v_apps      FROM public.graph_events
    WHERE user_id = _user_id AND event_type = 'user_applied_opportunity';

  -- Normalize (single transaction == strong signal; single cert breaks the floor)
  v_n_exp       := LEAST(100, GREATEST(v_exp_raw, v_verified*20));
  v_n_trust     := LEAST(100, GREATEST(v_trust_raw, v_verified*25));
  v_n_revenue   := CASE WHEN v_tx >= 1 THEN LEAST(100, 50 + v_tx*10 + LEAST(50, v_revenue/200))
                        WHEN v_consulting >= 1 THEN LEAST(100, 40 + v_consulting*20)
                        ELSE 0 END;
  v_n_ownership := LEAST(100, v_own * 5);
  v_n_activity  := LEAST(100, v_learning*15 + v_intent*10 + v_apps*5 + LEAST(40, v_verified*10));

  FOR r IN
    SELECT * FROM public.professional_state_weights ORDER BY sort_order
  LOOP
    DECLARE
      s numeric;
      gated boolean := false;
    BEGIN
      -- Hard gates: states tied to ownership require it to exist.
      IF v_own < r.min_ownership OR v_ventures < r.min_ventures THEN
        gated := true;
        s := 0;
      ELSE
        s := (v_n_exp       * r.weight_expertise
            + v_n_trust     * r.weight_trust
            + v_n_revenue   * r.weight_revenue
            + v_n_ownership * r.weight_ownership
            + v_n_activity  * r.weight_activity)
           / NULLIF((r.weight_expertise + r.weight_trust + r.weight_revenue + r.weight_ownership + r.weight_activity), 0);
        s := COALESCE(s, 0);
      END IF;

      scores := scores || jsonb_build_object(
        'state', r.state,
        'score', ROUND(s, 2),
        'gated', gated,
        'weights', jsonb_build_object(
          'expertise', r.weight_expertise, 'trust', r.weight_trust,
          'revenue', r.weight_revenue, 'ownership', r.weight_ownership,
          'activity', r.weight_activity)
      );

      IF s > best_score THEN
        runner_state := best_state; runner_score := best_score;
        best_state := r.state;      best_score := s;
      ELSIF s > runner_score THEN
        runner_state := r.state; runner_score := s;
      END IF;
    END;
  END LOOP;

  -- Reasons supporting the winning state
  reasons := '[]'::jsonb;
  IF v_verified >= 1     THEN reasons := reasons || jsonb_build_array(format('%s verified certification(s)', v_verified)); END IF;
  IF v_exp_raw  >= 20    THEN reasons := reasons || jsonb_build_array(format('%s expertise score', ROUND(v_exp_raw,0))); END IF;
  IF v_trust_raw>= 20    THEN reasons := reasons || jsonb_build_array(format('Trust score %s', ROUND(v_trust_raw,0))); END IF;
  IF v_tx       >= 1     THEN reasons := reasons || jsonb_build_array(format('%s completed engagement(s)', v_tx)); END IF;
  IF v_own      >  0     THEN reasons := reasons || jsonb_build_array(format('%s%% allocated equity', ROUND(v_own,1))); END IF;
  IF v_ventures >= 1     THEN reasons := reasons || jsonb_build_array(format('%s active venture(s)', v_ventures)); END IF;
  IF v_learning >  0     THEN reasons := reasons || jsonb_build_array(format('%s learning event(s)', v_learning)); END IF;

  -- Missing signals to reach the runner-up (only when runner is "ahead" in the sort_order)
  missing := '[]'::jsonb;
  IF runner_state IS NOT NULL THEN
    -- Generic missing-signal hints based on which weight dominates the runner state.
    DECLARE rw record;
    BEGIN
      SELECT * INTO rw FROM public.professional_state_weights WHERE state = runner_state;
      IF rw.min_ventures > v_ventures THEN missing := missing || jsonb_build_array('Launch a venture'); END IF;
      IF rw.min_ownership > v_own     THEN missing := missing || jsonb_build_array(format('Hold at least %s%% equity', rw.min_ownership)); END IF;
      IF rw.weight_revenue > 0  AND v_tx = 0          THEN missing := missing || jsonb_build_array('Complete first client engagement'); END IF;
      IF rw.weight_trust   >= 30 AND v_trust_raw < 40 THEN missing := missing || jsonb_build_array('Earn additional trust signals'); END IF;
      IF rw.weight_expertise >= 40 AND v_verified < 2 THEN missing := missing || jsonb_build_array('Add another verified certification'); END IF;
      IF rw.weight_activity  >= 30 AND v_learning < 1 THEN missing := missing || jsonb_build_array('Complete a learning module'); END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'user_id',       _user_id,
    'derived_state', best_state,
    'top_score',     ROUND(best_score, 2),
    'runner_up',     runner_state,
    'runner_score',  ROUND(runner_score, 2),
    'gap',           ROUND(best_score - runner_score, 2),
    'reasons',       reasons,
    'missing_for_next', missing,
    'signals', jsonb_build_object(
      'expertise',  ROUND(v_n_exp,1),
      'trust',      ROUND(v_n_trust,1),
      'revenue',    ROUND(v_n_revenue,1),
      'ownership',  ROUND(v_n_ownership,1),
      'activity',   ROUND(v_n_activity,1),
      'raw', jsonb_build_object(
        'expertise_score', v_exp_raw, 'verified_count', v_verified,
        'trust_score', v_trust_raw, 'transactions', v_tx, 'revenue', v_revenue,
        'equity', v_own, 'ventures', v_ventures, 'consulting', v_consulting,
        'learning', v_learning, 'intent', v_intent, 'applications', v_apps)
    ),
    'scores', scores
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.compute_user_state_scores(uuid) TO authenticated, service_role;

-- ============================================================
-- 3. Rewire derive_professional_state to use the weighted model
-- ============================================================
CREATE OR REPLACE FUNCTION public.derive_professional_state(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (public.compute_user_state_scores(_user_id) ->> 'derived_state'),
    'explorer'
  );
$$;

-- ============================================================
-- 4. Audit view for Beta Console
-- ============================================================
CREATE OR REPLACE VIEW public.beta_state_classification_audit AS
SELECT
  p.id                                                AS user_id,
  p.full_name,
  (s.payload ->> 'derived_state')                     AS derived_state,
  (s.payload ->> 'runner_up')                         AS runner_up,
  (s.payload ->> 'gap')::numeric                      AS gap,
  s.payload -> 'reasons'                              AS reasons,
  s.payload -> 'missing_for_next'                     AS missing,
  s.payload -> 'signals'                              AS signals,
  s.payload -> 'scores'                               AS scores
FROM public.profiles p
CROSS JOIN LATERAL (SELECT public.compute_user_state_scores(p.id) AS payload) s;

GRANT SELECT ON public.beta_state_classification_audit TO authenticated, service_role;
