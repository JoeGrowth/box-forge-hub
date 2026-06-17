INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema, deprecated)
VALUES
  ('stage_transition_evaluated', 1, 'progression', 'Stage transition evaluated for a user', '{"required":["from_state","to_state"]}'::jsonb, false),
  ('recommendation_generated',   1, 'progression', 'Next best action set generated', '{"required":["actions"]}'::jsonb, false),
  ('action_completed',           1, 'progression', 'User completed a recommended action', '{"required":["action"]}'::jsonb, false),
  ('milestone_reached',          1, 'progression', 'User reached a progression milestone', '{"required":["milestone"]}'::jsonb, false),
  ('goal_created',               1, 'progression', 'User created a personal goal', '{"required":["goal"]}'::jsonb, false),
  ('goal_completed',             1, 'progression', 'User completed a personal goal', '{"required":["goal"]}'::jsonb, false)
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.progression_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  source_stage text,
  target_stage text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  action_type text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.progression_rules TO authenticated;
GRANT ALL ON public.progression_rules TO service_role;

ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read enabled rules" ON public.progression_rules
  FOR SELECT TO authenticated USING (enabled = true);
CREATE POLICY "Admins manage rules" ON public.progression_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_progression_rules_updated
  BEFORE UPDATE ON public.progression_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.progression_graph (
  user_id uuid PRIMARY KEY,
  current_state text NOT NULL DEFAULT 'novice',
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_actions_count int NOT NULL DEFAULT 0,
  progression_score numeric NOT NULL DEFAULT 0,
  source_event_version bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.progression_graph TO authenticated;
GRANT ALL ON public.progression_graph TO service_role;

ALTER TABLE public.progression_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progression" ON public.progression_graph
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all progression" ON public.progression_graph
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.progression_rules (name, source_stage, target_stage, condition, priority, action_type, action_payload)
VALUES
  ('expertise_to_monetization', 'capable', 'monetizing',
   '{"verified_expertise_min":2,"trust_score_min":15}'::jsonb,
   10, 'publish_consulting_service',
   '{"link":"/consulting/new","label":"Publish a consulting service","category":"monetize"}'::jsonb),
  ('revenue_to_reputation', 'monetizing', 'recognized',
   '{"completed_transactions_min":1}'::jsonb,
   20, 'collect_validation',
   '{"link":"/profile","label":"Request a client review","category":"reputation"}'::jsonb),
  ('reputation_to_venture', 'recognized', 'building',
   '{"reputation_level_in":["recognized","expert","authority"]}'::jsonb,
   30, 'join_startup',
   '{"link":"/opportunities?kind=startup","label":"Join a co-builder opportunity","category":"venture"}'::jsonb),
  ('ownership_to_venture_creation', 'building', 'founder',
   '{"ownership_level_in":["meaningful_contributor","major_contributor","founder"],"reputation_score_min":40}'::jsonb,
   40, 'launch_venture',
   '{"link":"/startup/new","label":"Launch a new venture","category":"founder"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recompute_progression(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp_score numeric := 0;
  v_verified int := 0;
  v_trust_score numeric := 0;
  v_completed_tx int := 0;
  v_rep_score numeric := 0;
  v_rep_level text := 'verified';
  v_own_level text := 'none';
  v_own_alloc numeric := 0;
  v_current_state text;
  v_actions jsonb := '[]'::jsonb;
  v_completed_actions int := 0;
  v_prog_score numeric := 0;
  v_max_version bigint := 0;
  r record;
  v_ok boolean;
BEGIN
  SELECT COALESCE(expertise_score,0), COALESCE(verified_expertise_count,0)
    INTO v_exp_score, v_verified
    FROM public.expertise_graph WHERE user_id = _user_id;
  SELECT COALESCE(trust_score,0) INTO v_trust_score
    FROM public.trust_graph WHERE user_id = _user_id;
  SELECT COALESCE(completed_value_count,0) INTO v_completed_tx
    FROM public.revenue_graph WHERE user_id = _user_id;
  SELECT COALESCE(reputation_score,0), COALESCE(reputation_level,'verified')
    INTO v_rep_score, v_rep_level
    FROM public.reputation_graph WHERE user_id = _user_id;
  SELECT COALESCE(ownership_level,'none'), COALESCE(total_allocated_equity,0)
    INTO v_own_level, v_own_alloc
    FROM public.ownership_graph WHERE user_id = _user_id;

  v_current_state := CASE
    WHEN v_own_alloc >= 15 OR v_rep_level = 'authority' THEN 'founder'
    WHEN v_own_alloc > 0 OR v_rep_level IN ('expert','recognized') THEN 'building'
    WHEN v_completed_tx > 0 THEN 'monetizing'
    WHEN v_verified > 0 OR v_exp_score >= 8 THEN 'capable'
    WHEN v_exp_score > 0 THEN 'emerging'
    ELSE 'novice'
  END;

  SELECT COUNT(*) INTO v_completed_actions
    FROM public.graph_events
   WHERE user_id = _user_id AND event_type = 'action_completed';

  FOR r IN
    SELECT * FROM public.progression_rules
     WHERE enabled = true
     ORDER BY priority ASC
  LOOP
    v_ok := true;
    IF r.condition ? 'verified_expertise_min' AND v_verified < (r.condition->>'verified_expertise_min')::int THEN v_ok := false; END IF;
    IF v_ok AND r.condition ? 'trust_score_min' AND v_trust_score < (r.condition->>'trust_score_min')::numeric THEN v_ok := false; END IF;
    IF v_ok AND r.condition ? 'completed_transactions_min' AND v_completed_tx < (r.condition->>'completed_transactions_min')::int THEN v_ok := false; END IF;
    IF v_ok AND r.condition ? 'reputation_score_min' AND v_rep_score < (r.condition->>'reputation_score_min')::numeric THEN v_ok := false; END IF;
    IF v_ok AND r.condition ? 'reputation_level_in' AND NOT (v_rep_level = ANY (
      ARRAY(SELECT jsonb_array_elements_text(r.condition->'reputation_level_in'))
    )) THEN v_ok := false; END IF;
    IF v_ok AND r.condition ? 'ownership_level_in' AND NOT (v_own_level = ANY (
      ARRAY(SELECT jsonb_array_elements_text(r.condition->'ownership_level_in'))
    )) THEN v_ok := false; END IF;

    IF v_ok THEN
      v_actions := v_actions || jsonb_build_array(jsonb_build_object(
        'rule', r.name,
        'action', r.action_type,
        'payload', r.action_payload,
        'target_stage', r.target_stage,
        'priority', r.priority,
        'reason', jsonb_build_object(
          'verified_expertise', v_verified,
          'trust_score', round(v_trust_score,1),
          'completed_transactions', v_completed_tx,
          'reputation_level', v_rep_level,
          'ownership_level', v_own_level
        ),
        'required_signals', r.condition,
        'target_graph', CASE r.action_type
          WHEN 'publish_consulting_service' THEN 'revenue'
          WHEN 'collect_validation' THEN 'reputation'
          WHEN 'join_startup' THEN 'ownership'
          WHEN 'launch_venture' THEN 'ownership'
          ELSE 'opportunity' END
      ));
    END IF;
  END LOOP;

  v_prog_score := LEAST(100,
      (CASE v_current_state
        WHEN 'novice' THEN 5
        WHEN 'emerging' THEN 20
        WHEN 'capable' THEN 40
        WHEN 'monetizing' THEN 60
        WHEN 'building' THEN 80
        WHEN 'founder' THEN 95
        ELSE 0 END)
    + LEAST(20, v_completed_actions::numeric)
  );

  SELECT COALESCE(MAX(version),0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.progression_graph (
    user_id, current_state, recommended_actions, completed_actions_count,
    progression_score, source_event_version, computed_at
  ) VALUES (
    _user_id, v_current_state, v_actions, v_completed_actions,
    v_prog_score, v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_state = EXCLUDED.current_state,
    recommended_actions = EXCLUDED.recommended_actions,
    completed_actions_count = EXCLUDED.completed_actions_count,
    progression_score = EXCLUDED.progression_score,
    source_event_version = EXCLUDED.source_event_version,
    computed_at = EXCLUDED.computed_at;
END $$;

REVOKE EXECUTE ON FUNCTION public.recompute_progression(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_progression(uuid) TO authenticated, service_role;