
-- ============================================================
-- Phase 8 hardening — experiments + intent + outcome + states.
-- ============================================================

-- Catalog the new contracts.
INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema) VALUES
  ('intent_declared',                 1, 'intent.graph',  'User explicitly declared an intent (goal, category, availability).', '{"required":["intent_key"]}'::jsonb),
  ('intent_signal_recorded',          1, 'intent.graph',  'Implicit intent signal (save/dismiss/click).',                       '{"required":["signal","intent_key"]}'::jsonb),
  ('recommendation_outcome_recorded', 1, 'growth.loops',  'A recommendation produced a measurable downstream outcome.',         '{"required":["loop_key","outcome"]}'::jsonb),
  ('experiment_assigned',             1, 'growth.loops',  'A user was assigned to a growth-loop experiment variant.',           '{"required":["loop_key","variant_key"]}'::jsonb),
  ('experiment_converted',            1, 'growth.loops',  'A variant produced its declared success metric.',                    '{"required":["loop_key","variant_key"]}'::jsonb)
ON CONFLICT (event_type, event_version) DO NOTHING;

-- ----------------------------------------------------------------
-- 1) Experiments. Variants override the loop action payload.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_loop_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_key text NOT NULL REFERENCES public.growth_loops(loop_key) ON DELETE CASCADE,
  variant_key text NOT NULL,
  description text,
  allocation_percentage int NOT NULL DEFAULT 50 CHECK (allocation_percentage BETWEEN 0 AND 100),
  action_payload_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_metric text NOT NULL DEFAULT 'converted',  -- converted|engaged|outcome
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loop_key, variant_key)
);
GRANT SELECT ON public.growth_loop_experiments TO authenticated;
GRANT ALL ON public.growth_loop_experiments TO service_role;
ALTER TABLE public.growth_loop_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_loop_experiments readable" ON public.growth_loop_experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "growth_loop_experiments managed by admin" ON public.growth_loop_experiments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_growth_loop_experiments_updated BEFORE UPDATE ON public.growth_loop_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.growth_loop_runs ADD COLUMN IF NOT EXISTS variant_key text;

-- Deterministic per-user variant: stable hash bucketed against allocation.
CREATE OR REPLACE FUNCTION public.pick_growth_loop_variant(_loop_key text, _user_id uuid)
RETURNS TABLE (variant_key text, action_payload jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base jsonb;
  v_bucket int;
  v_acc int := 0;
  r record;
BEGIN
  SELECT action_payload INTO v_base FROM public.growth_loops WHERE loop_key = _loop_key;
  -- 0..99 bucket from stable hash. Same user + loop -> same bucket forever.
  v_bucket := abs(hashtext(_loop_key || ':' || _user_id::text)) % 100;
  FOR r IN
    SELECT variant_key AS vk, allocation_percentage AS pct, action_payload_override AS po
      FROM public.growth_loop_experiments
     WHERE loop_key = _loop_key AND enabled = true
     ORDER BY variant_key
  LOOP
    v_acc := v_acc + r.pct;
    IF v_bucket < v_acc THEN
      variant_key := r.vk;
      action_payload := COALESCE(v_base,'{}'::jsonb) || COALESCE(r.po,'{}'::jsonb);
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  variant_key := 'control';
  action_payload := COALESCE(v_base,'{}'::jsonb);
  RETURN NEXT;
END $$;
REVOKE EXECUTE ON FUNCTION public.pick_growth_loop_variant(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pick_growth_loop_variant(text, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------
-- 2) Intent layer. Signals + projection.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_key text NOT NULL,             -- e.g. 'monetize_consulting', 'find_cofounder', 'category:training'
  signal text NOT NULL,                 -- 'declared'|'saved'|'dismissed'|'viewed'|'applied'
  weight numeric NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'app',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_intents_user ON public.user_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_intents_key  ON public.user_intents(user_id, intent_key);
GRANT SELECT, INSERT ON public.user_intents TO authenticated;
GRANT ALL ON public.user_intents TO service_role;
ALTER TABLE public.user_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_intents insert own" ON public.user_intents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_intents read own"   ON public.user_intents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.intent_graph (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  declared_intents text[] NOT NULL DEFAULT '{}',
  top_categories text[] NOT NULL DEFAULT '{}',
  suppressed_loops text[] NOT NULL DEFAULT '{}',
  availability text,
  signal_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent_score numeric NOT NULL DEFAULT 0,
  source_event_version bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intent_graph TO authenticated;
GRANT ALL ON public.intent_graph TO service_role;
ALTER TABLE public.intent_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intent_graph read own"  ON public.intent_graph FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "intent_graph admin all" ON public.intent_graph FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recompute_intent(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_declared text[]; v_top text[]; v_suppressed text[];
  v_breakdown jsonb; v_score numeric := 0; v_max_version bigint;
BEGIN
  -- Declared intents (explicit).
  SELECT COALESCE(array_agg(DISTINCT intent_key) FILTER (WHERE signal = 'declared'), '{}')
    INTO v_declared FROM public.user_intents WHERE user_id = _user_id;

  -- Top categories from save/view/applied signals over recent 90 days.
  WITH recent AS (
    SELECT intent_key, signal,
           CASE signal WHEN 'applied' THEN 5 WHEN 'saved' THEN 3 WHEN 'viewed' THEN 1 ELSE 0 END * weight AS w
      FROM public.user_intents
     WHERE user_id = _user_id
       AND created_at > now() - interval '90 days'
       AND intent_key LIKE 'category:%'
  ), agg AS (
    SELECT intent_key, SUM(w) AS s FROM recent GROUP BY intent_key ORDER BY SUM(w) DESC
  )
  SELECT COALESCE(array_agg(intent_key), '{}') INTO v_top
    FROM (SELECT intent_key FROM agg LIMIT 5) t;

  -- Suppressed loops: dismissed at least twice in last 30 days OR feedback verdict='irrelevant'.
  WITH d AS (
    SELECT rule AS loop_key, COUNT(*) AS c
      FROM public.recommendation_feedback
     WHERE user_id = _user_id
       AND created_at > now() - interval '30 days'
       AND verdict IN ('dismissed','irrelevant')
     GROUP BY rule
  )
  SELECT COALESCE(array_agg(loop_key), '{}') INTO v_suppressed
    FROM d WHERE c >= 2 OR EXISTS (
      SELECT 1 FROM public.recommendation_feedback rf
       WHERE rf.user_id = _user_id AND rf.rule = d.loop_key AND rf.verdict = 'irrelevant'
    );

  SELECT COALESCE(jsonb_object_agg(signal, c), '{}'::jsonb), COALESCE(SUM(c)::numeric, 0)
    INTO v_breakdown, v_score
    FROM (SELECT signal, COUNT(*) AS c FROM public.user_intents WHERE user_id = _user_id GROUP BY signal) s;

  SELECT COALESCE(MAX(version),0) INTO v_max_version FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.intent_graph (user_id, declared_intents, top_categories, suppressed_loops,
                                   signal_breakdown, intent_score, source_event_version, computed_at)
  VALUES (_user_id, v_declared, v_top, v_suppressed, v_breakdown, v_score, v_max_version, now())
  ON CONFLICT (user_id) DO UPDATE SET
    declared_intents=EXCLUDED.declared_intents,
    top_categories=EXCLUDED.top_categories,
    suppressed_loops=EXCLUDED.suppressed_loops,
    signal_breakdown=EXCLUDED.signal_breakdown,
    intent_score=EXCLUDED.intent_score,
    source_event_version=EXCLUDED.source_event_version,
    computed_at=EXCLUDED.computed_at;
END $$;
REVOKE EXECUTE ON FUNCTION public.recompute_intent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_intent(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------
-- 3) Outcome feedback. Closes the loop measurement gap.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loop_key text NOT NULL,
  run_id uuid REFERENCES public.growth_loop_runs(id) ON DELETE SET NULL,
  outcome text NOT NULL,                -- 'applied'|'accepted'|'completed'|'revenue_created'|'venture_created'
  value numeric NOT NULL DEFAULT 0,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_user ON public.recommendation_outcomes(user_id, created_at DESC);
GRANT SELECT ON public.recommendation_outcomes TO authenticated;
GRANT ALL ON public.recommendation_outcomes TO service_role;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_outcomes read own" ON public.recommendation_outcomes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- Recorder. Called by worker when downstream outcomes occur.
CREATE OR REPLACE FUNCTION public.record_recommendation_outcome(
  _user_id uuid, _outcome text, _value numeric, _context jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count int := 0;
BEGIN
  -- Attribute outcome to any active run created within the last 30 days.
  FOR r IN
    SELECT id, loop_key FROM public.growth_loop_runs
     WHERE user_id = _user_id
       AND status IN ('triggered','notified','engaged')
       AND created_at > now() - interval '30 days'
  LOOP
    INSERT INTO public.recommendation_outcomes (user_id, loop_key, run_id, outcome, value, context)
    VALUES (_user_id, r.loop_key, r.id, _outcome, COALESCE(_value,0), COALESCE(_context,'{}'::jsonb));

    UPDATE public.growth_loop_runs SET status='converted', converted_at=now() WHERE id = r.id;

    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (_user_id, 'recommendation_outcome_recorded'::graph_event_type, 1, 'growth_loop', r.id::text,
      'growth.loops',
      'recommendation_outcome_recorded:v1:'||r.id::text||':'||_outcome,
      jsonb_build_object('loop_key', r.loop_key, 'run_id', r.id::text, 'outcome', _outcome, 'value', _value),
      1, now())
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_recommendation_outcome(uuid, text, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome(uuid, text, numeric, jsonb) TO service_role;

-- ----------------------------------------------------------------
-- 4) Professional state machine. Pure derivation, no storage.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.derive_professional_state(_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exp numeric := 0; v_verified int := 0; v_completed_tx int := 0;
  v_rep_level text := 'verified'; v_own_alloc numeric := 0; v_ventures int := 0;
  v_consulting int := 0; v_user_node uuid;
BEGIN
  SELECT COALESCE(expertise_score,0), COALESCE(verified_expertise_count,0)
    INTO v_exp, v_verified FROM public.expertise_graph WHERE user_id = _user_id;
  SELECT COALESCE(completed_value_count,0) INTO v_completed_tx FROM public.revenue_graph WHERE user_id = _user_id;
  SELECT COALESCE(reputation_level,'verified') INTO v_rep_level FROM public.reputation_graph WHERE user_id = _user_id;
  SELECT COALESCE(total_allocated_equity,0), COALESCE(venture_count,0)
    INTO v_own_alloc, v_ventures FROM public.ownership_graph WHERE user_id = _user_id;
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);
  SELECT COUNT(*) INTO v_consulting FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';

  RETURN CASE
    WHEN v_ventures >= 1 AND v_own_alloc >= 15            THEN 'venture_creator'
    WHEN v_own_alloc > 0                                  THEN 'co_builder'
    WHEN v_consulting >= 3 OR v_rep_level IN ('expert','authority') THEN 'professional_operator'
    WHEN v_verified >= 1 AND v_completed_tx >= 1          THEN 'validated_expert'
    WHEN v_exp >= 8 OR v_verified >= 1                    THEN 'builder'
    ELSE 'explorer'
  END;
END $$;
REVOKE EXECUTE ON FUNCTION public.derive_professional_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.derive_professional_state(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------
-- 5) Tighten dispatcher: honour suppressed loops + assign variant.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_growth_loops(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rep_level text; v_rep_score numeric := 0;
  v_completed_tx int := 0; v_verified int := 0; v_apps int := 0;
  v_own_alloc numeric := 0; v_consulting_completed int := 0;
  v_progression jsonb := '[]'::jsonb; v_top_action jsonb;
  v_user_node uuid; r record; v_should boolean; v_last timestamptz;
  v_run_id uuid; v_created int := 0; v_ctx jsonb;
  v_suppressed text[]; v_variant text; v_payload jsonb;
BEGIN
  SELECT COALESCE(reputation_level,'verified'), COALESCE(reputation_score,0)
    INTO v_rep_level, v_rep_score FROM public.reputation_graph WHERE user_id = _user_id;
  SELECT COALESCE(completed_value_count,0) INTO v_completed_tx FROM public.revenue_graph WHERE user_id = _user_id;
  SELECT COALESCE(verified_expertise_count,0) INTO v_verified FROM public.expertise_graph WHERE user_id = _user_id;
  SELECT COALESCE(total_allocated_equity,0) INTO v_own_alloc FROM public.ownership_graph WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_apps FROM public.graph_events WHERE user_id = _user_id AND event_type = 'user_applied_opportunity';
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);
  SELECT COUNT(*) INTO v_consulting_completed FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';
  SELECT COALESCE(recommended_actions,'[]'::jsonb) INTO v_progression FROM public.progression_graph WHERE user_id = _user_id;
  v_top_action := COALESCE(v_progression->0, '{}'::jsonb);
  SELECT COALESCE(suppressed_loops,'{}') INTO v_suppressed FROM public.intent_graph WHERE user_id = _user_id;
  IF v_suppressed IS NULL THEN v_suppressed := '{}'; END IF;

  v_ctx := jsonb_build_object(
    'reputation_level', v_rep_level, 'reputation_score', v_rep_score,
    'completed_transactions', v_completed_tx, 'verified', v_verified,
    'applications', v_apps, 'ownership_allocated', v_own_alloc,
    'consulting_completed', v_consulting_completed, 'top_progression_action', v_top_action,
    'professional_state', public.derive_professional_state(_user_id)
  );

  FOR r IN SELECT * FROM public.growth_loops WHERE enabled = true ORDER BY priority ASC
  LOOP
    -- Intent suppression: skip loops the user keeps rejecting.
    IF r.loop_key = ANY (v_suppressed) THEN CONTINUE; END IF;

    SELECT MAX(created_at) INTO v_last FROM public.growth_loop_runs
     WHERE user_id = _user_id AND loop_key = r.loop_key AND status NOT IN ('dismissed','expired');
    IF v_last IS NOT NULL AND v_last > now() - make_interval(hours => r.cooldown_hours) THEN CONTINUE; END IF;

    v_should := true;
    IF r.condition ? 'min_reputation_level' THEN
      v_should := v_should AND CASE r.condition->>'min_reputation_level'
        WHEN 'verified'    THEN true
        WHEN 'established' THEN v_rep_level IN ('established','recognized','expert','authority')
        WHEN 'recognized'  THEN v_rep_level IN ('recognized','expert','authority')
        WHEN 'expert'      THEN v_rep_level IN ('expert','authority')
        WHEN 'authority'   THEN v_rep_level = 'authority'
        ELSE true END;
    END IF;
    IF r.condition ? 'min_reputation_score'      THEN v_should := v_should AND v_rep_score >= (r.condition->>'min_reputation_score')::numeric; END IF;
    IF r.condition ? 'min_completed_transactions' THEN v_should := v_should AND v_completed_tx >= (r.condition->>'min_completed_transactions')::int; END IF;
    IF r.condition ? 'min_verified'              THEN v_should := v_should AND v_verified >= (r.condition->>'min_verified')::int; END IF;
    IF r.condition ? 'max_applications'          THEN v_should := v_should AND v_apps <= (r.condition->>'max_applications')::int; END IF;
    IF r.condition ? 'min_ownership_allocated'   THEN v_should := v_should AND v_own_alloc >= (r.condition->>'min_ownership_allocated')::numeric; END IF;
    IF r.condition ? 'min_consulting_completed'  THEN v_should := v_should AND v_consulting_completed >= (r.condition->>'min_consulting_completed')::int; END IF;
    IF NOT v_should THEN CONTINUE; END IF;

    -- Variant pick (deterministic per user; 'control' if no experiment).
    SELECT p.variant_key, p.action_payload INTO v_variant, v_payload
      FROM public.pick_growth_loop_variant(r.loop_key, _user_id) p;

    INSERT INTO public.growth_loop_runs (user_id, loop_key, status, context, variant_key)
    VALUES (_user_id, r.loop_key, 'triggered', v_ctx, v_variant)
    RETURNING id INTO v_run_id;

    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (_user_id, 'growth_loop_triggered'::graph_event_type, 1, 'growth_loop', v_run_id::text,
      'growth.loops', 'growth_loop_triggered:v1:'||v_run_id::text,
      jsonb_build_object('loop_key', r.loop_key, 'run_id', v_run_id::text,
        'action_kind', r.action_kind, 'action_payload', v_payload, 'variant_key', v_variant),
      1, now());

    IF v_variant <> 'control' THEN
      INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
        source_module, idempotency_key, payload, weight, occurred_at)
      VALUES (_user_id, 'experiment_assigned'::graph_event_type, 1, 'growth_loop', v_run_id::text,
        'growth.loops', 'experiment_assigned:v1:'||v_run_id::text,
        jsonb_build_object('loop_key', r.loop_key, 'variant_key', v_variant, 'run_id', v_run_id::text),
        1, now());
    END IF;

    INSERT INTO public.user_notifications (user_id, title, message, notification_type, link)
    VALUES (_user_id,
      COALESCE(v_payload->>'title', r.description),
      COALESCE(v_payload->>'message', r.description),
      'growth_loop',
      COALESCE(v_payload->>'link', '/profile'));

    UPDATE public.growth_loop_runs SET status='notified', notified_at=now() WHERE id = v_run_id;
    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (_user_id, 'growth_loop_notified'::graph_event_type, 1, 'growth_loop', v_run_id::text,
      'growth.loops', 'growth_loop_notified:v1:'||v_run_id::text,
      jsonb_build_object('loop_key', r.loop_key, 'run_id', v_run_id::text), 1, now());

    v_created := v_created + 1;
  END LOOP;
  RETURN v_created;
END $$;
REVOKE EXECUTE ON FUNCTION public.dispatch_growth_loops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_growth_loops(uuid) TO authenticated, service_role;
