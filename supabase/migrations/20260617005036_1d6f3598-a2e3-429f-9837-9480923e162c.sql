
-- Phase 8.1 — register event contracts.
INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema)
VALUES
  ('growth_loop_triggered', 1, 'growth.loops', 'A growth loop rule matched and a run was created.', '{"required":["loop_key","run_id"]}'::jsonb),
  ('growth_loop_notified',  1, 'growth.loops', 'The user was notified about a growth loop run.',     '{"required":["loop_key","run_id"]}'::jsonb),
  ('growth_loop_engaged',   1, 'growth.loops', 'The user opened or clicked a growth loop CTA.',      '{"required":["loop_key","run_id"]}'::jsonb),
  ('growth_loop_converted', 1, 'growth.loops', 'The user completed the loop target action.',         '{"required":["loop_key","run_id"]}'::jsonb),
  ('growth_loop_dismissed', 1, 'growth.loops', 'The user dismissed a growth loop suggestion.',       '{"required":["loop_key","run_id"]}'::jsonb),
  ('recommendation_feedback_recorded', 1, 'growth.loops', 'User feedback on a recommendation.',      '{"required":["rule","verdict"]}'::jsonb)
ON CONFLICT (event_type, event_version) DO NOTHING;

-- 2) Growth loop rule catalog. Data-driven; never hardcoded in app code.
CREATE TABLE IF NOT EXISTS public.growth_loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_key text NOT NULL UNIQUE,
  description text NOT NULL,
  trigger_source text NOT NULL DEFAULT 'progression',  -- 'progression' | 'reputation' | 'ownership' | 'manual'
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,        -- e.g. {"min_reputation":60,"min_consulting_completed":5}
  action_kind text NOT NULL,                            -- 'notify' | 'suggest_opportunity' | 'schedule_engagement'
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {"title":"...","link":"...","opportunity_kind":"training"}
  cooldown_hours integer NOT NULL DEFAULT 168,          -- avoid re-triggering for the same user
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.growth_loops TO authenticated;
GRANT ALL ON public.growth_loops TO service_role;
ALTER TABLE public.growth_loops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_loops readable by authenticated" ON public.growth_loops FOR SELECT TO authenticated USING (true);
CREATE POLICY "growth_loops managed by admin" ON public.growth_loops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_growth_loops_updated BEFORE UPDATE ON public.growth_loops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Runs: one row per (user, loop) trigger. The conversion ledger.
CREATE TABLE IF NOT EXISTS public.growth_loop_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loop_key text NOT NULL REFERENCES public.growth_loops(loop_key) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'triggered',  -- triggered|notified|engaged|converted|dismissed|expired
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  engaged_at timestamptz,
  converted_at timestamptz,
  dismissed_at timestamptz,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,  -- snapshot of signals at trigger time
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_growth_loop_runs_user ON public.growth_loop_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_loop_runs_loop ON public.growth_loop_runs(loop_key, status);
GRANT SELECT, UPDATE ON public.growth_loop_runs TO authenticated;
GRANT ALL ON public.growth_loop_runs TO service_role;
ALTER TABLE public.growth_loop_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_loop_runs read own" ON public.growth_loop_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "growth_loop_runs update own" ON public.growth_loop_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- 4) Recommendation feedback ledger.
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule text NOT NULL,
  verdict text NOT NULL,                       -- accepted|dismissed|snoozed|irrelevant
  source text NOT NULL DEFAULT 'progression',  -- 'progression'|'growth_loop'|'opportunity'
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON public.recommendation_feedback(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.recommendation_feedback TO authenticated;
GRANT ALL ON public.recommendation_feedback TO service_role;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_feedback insert own" ON public.recommendation_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "recommendation_feedback read own" ON public.recommendation_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- 5) Seed default loops. Conservative; admin can disable.
INSERT INTO public.growth_loops (loop_key, description, trigger_source, condition, action_kind, action_payload, priority) VALUES
  ('consulting_to_training', 'Expert consultants are nudged to productize via training.', 'reputation',
   '{"min_reputation_level":"expert","min_consulting_completed":5}'::jsonb,
   'suggest_opportunity',
   '{"title":"Productize your consulting into a training","link":"/training/publish","opportunity_kind":"training","category":"monetization"}'::jsonb, 10),
  ('first_completion_to_review', 'Ask the buyer to leave a review after first completed transaction.', 'progression',
   '{"min_completed_transactions":1}'::jsonb,
   'notify',
   '{"title":"Share a review","link":"/profile","category":"trust"}'::jsonb, 20),
  ('verified_to_apply', 'Verified user with zero applications is nudged to apply.', 'progression',
   '{"min_verified":1,"max_applications":0}'::jsonb,
   'notify',
   '{"title":"Apply to your first opportunity","link":"/opportunities","category":"matching"}'::jsonb, 30),
  ('reputation_to_venture', 'Authority reputation + ownership history → suggest venture creation.', 'reputation',
   '{"min_reputation_level":"authority","min_ownership_allocated":5}'::jsonb,
   'suggest_opportunity',
   '{"title":"Create your venture","link":"/create-idea","opportunity_kind":"startup","category":"venture"}'::jsonb, 5),
  ('progression_next_best', 'Surface the top recommended action from the Progression Engine.', 'progression',
   '{}'::jsonb,
   'notify',
   '{"title":"Your next best action","link":"/profile","category":"progression"}'::jsonb, 100)
ON CONFLICT (loop_key) DO NOTHING;

-- 6) Dispatcher. Pure function of upstream projections + rule catalog.
CREATE OR REPLACE FUNCTION public.dispatch_growth_loops(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rep_level text; v_rep_score numeric := 0;
  v_completed_tx int := 0;
  v_verified int := 0;
  v_apps int := 0;
  v_own_alloc numeric := 0;
  v_consulting_completed int := 0;
  v_progression jsonb := '[]'::jsonb;
  v_top_action jsonb;
  v_user_node uuid;
  r record;
  v_should boolean;
  v_last timestamptz;
  v_run_id uuid;
  v_created int := 0;
  v_ctx jsonb;
BEGIN
  SELECT COALESCE(reputation_level,'verified'), COALESCE(reputation_score,0)
    INTO v_rep_level, v_rep_score
    FROM public.reputation_graph WHERE user_id = _user_id;

  SELECT COALESCE(completed_value_count,0) INTO v_completed_tx
    FROM public.revenue_graph WHERE user_id = _user_id;

  SELECT COALESCE(verified_expertise_count,0) INTO v_verified
    FROM public.expertise_graph WHERE user_id = _user_id;

  SELECT COALESCE(total_allocated_equity,0) INTO v_own_alloc
    FROM public.ownership_graph WHERE user_id = _user_id;

  SELECT COUNT(*) INTO v_apps
    FROM public.graph_events
   WHERE user_id = _user_id AND event_type = 'user_applied_opportunity';

  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);
  SELECT COUNT(*) INTO v_consulting_completed
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';

  SELECT COALESCE(recommended_actions,'[]'::jsonb) INTO v_progression
    FROM public.progression_graph WHERE user_id = _user_id;
  v_top_action := COALESCE(v_progression->0, '{}'::jsonb);

  v_ctx := jsonb_build_object(
    'reputation_level', v_rep_level, 'reputation_score', v_rep_score,
    'completed_transactions', v_completed_tx, 'verified', v_verified,
    'applications', v_apps, 'ownership_allocated', v_own_alloc,
    'consulting_completed', v_consulting_completed,
    'top_progression_action', v_top_action
  );

  FOR r IN SELECT * FROM public.growth_loops WHERE enabled = true ORDER BY priority ASC
  LOOP
    -- cooldown
    SELECT MAX(created_at) INTO v_last
      FROM public.growth_loop_runs
     WHERE user_id = _user_id AND loop_key = r.loop_key
       AND status NOT IN ('dismissed','expired');
    IF v_last IS NOT NULL AND v_last > now() - make_interval(hours => r.cooldown_hours) THEN
      CONTINUE;
    END IF;

    -- evaluate condition (all keys must hold)
    v_should := true;
    IF r.condition ? 'min_reputation_level' THEN
      v_should := v_should AND (
        CASE r.condition->>'min_reputation_level'
          WHEN 'verified'    THEN true
          WHEN 'established' THEN v_rep_level IN ('established','recognized','expert','authority')
          WHEN 'recognized'  THEN v_rep_level IN ('recognized','expert','authority')
          WHEN 'expert'      THEN v_rep_level IN ('expert','authority')
          WHEN 'authority'   THEN v_rep_level = 'authority'
          ELSE true
        END);
    END IF;
    IF r.condition ? 'min_reputation_score' THEN
      v_should := v_should AND v_rep_score >= (r.condition->>'min_reputation_score')::numeric;
    END IF;
    IF r.condition ? 'min_completed_transactions' THEN
      v_should := v_should AND v_completed_tx >= (r.condition->>'min_completed_transactions')::int;
    END IF;
    IF r.condition ? 'min_verified' THEN
      v_should := v_should AND v_verified >= (r.condition->>'min_verified')::int;
    END IF;
    IF r.condition ? 'max_applications' THEN
      v_should := v_should AND v_apps <= (r.condition->>'max_applications')::int;
    END IF;
    IF r.condition ? 'min_ownership_allocated' THEN
      v_should := v_should AND v_own_alloc >= (r.condition->>'min_ownership_allocated')::numeric;
    END IF;
    IF r.condition ? 'min_consulting_completed' THEN
      v_should := v_should AND v_consulting_completed >= (r.condition->>'min_consulting_completed')::int;
    END IF;

    IF NOT v_should THEN CONTINUE; END IF;

    INSERT INTO public.growth_loop_runs (user_id, loop_key, status, context)
    VALUES (_user_id, r.loop_key, 'triggered', v_ctx)
    RETURNING id INTO v_run_id;

    -- emit triggered event
    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (_user_id, 'growth_loop_triggered'::graph_event_type, 1, 'growth_loop', v_run_id::text,
      'growth.loops',
      'growth_loop_triggered:v1:'||v_run_id::text,
      jsonb_build_object('loop_key', r.loop_key, 'run_id', v_run_id::text,
        'action_kind', r.action_kind, 'action_payload', r.action_payload),
      1, now());

    -- notification_engine: write a user_notification + mark notified.
    INSERT INTO public.user_notifications (user_id, title, message, notification_type, link)
    VALUES (
      _user_id,
      COALESCE(r.action_payload->>'title', r.description),
      COALESCE(r.action_payload->>'message', r.description),
      'growth_loop',
      COALESCE(r.action_payload->>'link', '/profile')
    );

    UPDATE public.growth_loop_runs
       SET status = 'notified', notified_at = now()
     WHERE id = v_run_id;

    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (_user_id, 'growth_loop_notified'::graph_event_type, 1, 'growth_loop', v_run_id::text,
      'growth.loops',
      'growth_loop_notified:v1:'||v_run_id::text,
      jsonb_build_object('loop_key', r.loop_key, 'run_id', v_run_id::text),
      1, now());

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END $$;

REVOKE EXECUTE ON FUNCTION public.dispatch_growth_loops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_growth_loops(uuid) TO authenticated, service_role;
