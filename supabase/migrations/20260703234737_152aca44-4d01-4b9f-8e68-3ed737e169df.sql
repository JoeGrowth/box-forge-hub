
-- =============================================================================
-- GROWTH JOURNEY — MVP FOUNDATION MIGRATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Platform principals + partners
-- -----------------------------------------------------------------------------

CREATE TABLE public.platform_principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_principals TO authenticated;
GRANT ALL    ON public.platform_principals TO service_role;
ALTER TABLE public.platform_principals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "principals_read_auth" ON public.platform_principals
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.platform_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN
    ('inspiring_advisor','legal','accounting','insurance','university','accelerator','other')),
  default_assignment_role text NOT NULL,
  priority int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_partners TO authenticated;
GRANT ALL    ON public.platform_partners TO service_role;
ALTER TABLE public.platform_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_read_auth" ON public.platform_partners
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_default_partner(_relationship_type text)
RETURNS public.platform_partners
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.platform_partners
   WHERE relationship_type = _relationship_type AND active
   ORDER BY priority ASC, slug ASC
   LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_default_partner(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Progression registries (normalized — no jsonb predicate blob)
-- -----------------------------------------------------------------------------

CREATE TABLE public.progression_predicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  handler text NOT NULL UNIQUE,
  arg_type text NOT NULL CHECK (arg_type IN ('none','int','text')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.progression_predicates TO authenticated;
GRANT ALL    ON public.progression_predicates TO service_role;
ALTER TABLE public.progression_predicates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preds_read_auth" ON public.progression_predicates
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.progression_predicates (slug, handler, arg_type, description) VALUES
  ('onboarding_completed',    'onboarding_completed',    'none', 'Intent + Natural Role + Track Record + Resume complete'),
  ('paid_missions_count_min', 'paid_missions_count_min', 'int',  'User has at least N paid declaration_missions'),
  ('brand_missing',           'brand_missing',           'none', 'User does not yet own a brand_entity organization'),
  ('milestone_reached',       'milestone_reached',       'text', 'Named milestone from progression_milestones reached');

CREATE TABLE public.progression_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  metric text NOT NULL,
  aggregation text NOT NULL CHECK (aggregation IN ('COUNT','SUM','DISTINCT_COUNT','MAX')),
  threshold int NOT NULL,
  scope text NOT NULL DEFAULT 'USER' CHECK (scope IN ('USER','ORGANIZATION')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.progression_milestones TO authenticated;
GRANT ALL    ON public.progression_milestones TO service_role;
ALTER TABLE public.progression_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones_read_auth" ON public.progression_milestones
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.progression_milestones (slug, metric, aggregation, threshold, scope, description) VALUES
  ('first_paid_mission', 'paid_missions', 'COUNT', 1,  'USER', 'First paid mission declared'),
  ('first_ten_missions', 'paid_missions', 'COUNT', 10, 'USER', 'Ten paid missions declared'),
  ('fifty_missions',     'paid_missions', 'COUNT', 50, 'USER', 'Fifty paid missions declared');

CREATE TABLE public.progression_rule_predicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.progression_rules(id) ON DELETE CASCADE,
  predicate_id uuid NOT NULL REFERENCES public.progression_predicates(id) ON DELETE RESTRICT,
  argument text,
  evaluation_order int NOT NULL,
  UNIQUE (rule_id, evaluation_order)
);
GRANT SELECT ON public.progression_rule_predicates TO authenticated;
GRANT ALL    ON public.progression_rule_predicates TO service_role;
ALTER TABLE public.progression_rule_predicates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rule_preds_read_auth" ON public.progression_rule_predicates
  FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 3. Predicate functions (static, no dynamic SQL)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.p_onboarding_completed(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.natural_roles nr
       WHERE nr.user_id = _uid
         AND nr.description IS NOT NULL
         AND length(trim(nr.description)) > 0
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = _uid
         AND p.professional_title  IS NOT NULL
         AND p.bio                 IS NOT NULL
         AND p.summary_statement   IS NOT NULL
         AND p.primary_skills      IS NOT NULL
         AND p.key_projects        IS NOT NULL
         AND p.education_certifications IS NOT NULL
         AND p.years_of_experience IS NOT NULL
    )
$$;

CREATE OR REPLACE FUNCTION public.p_paid_missions_count(_uid uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(count(*)::int, 0)
    FROM public.declaration_missions dm
    JOIN public.declaration_entities de ON de.id = dm.entity_id
   WHERE de.owner_id = _uid AND dm.client_paid = true
$$;

CREATE OR REPLACE FUNCTION public.p_paid_missions_count_min(_uid uuid, _min int)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.p_paid_missions_count(_uid) >= _min
$$;

CREATE OR REPLACE FUNCTION public.p_brand_missing(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.organizations o
     WHERE o.created_by = _uid AND o.type = 'brand_entity'
  )
$$;

CREATE OR REPLACE FUNCTION public.p_milestone_reached(_uid uuid, _slug text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.progression_milestones;
  v int;
BEGIN
  SELECT * INTO m FROM public.progression_milestones WHERE slug = _slug;
  IF NOT FOUND THEN RETURN false; END IF;

  IF m.scope = 'USER' AND m.metric = 'paid_missions' AND m.aggregation = 'COUNT' THEN
    v := public.p_paid_missions_count(_uid);
  ELSE
    v := 0;
  END IF;

  RETURN v >= m.threshold;
END;
$$;

-- Static dispatcher. Adding a predicate = one CASE arm + one row.
CREATE OR REPLACE FUNCTION public.evaluate_predicate(_handler text, _uid uuid, _arg text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CASE _handler
    WHEN 'onboarding_completed'    THEN RETURN public.p_onboarding_completed(_uid);
    WHEN 'paid_missions_count_min' THEN RETURN public.p_paid_missions_count_min(_uid, COALESCE(_arg,'0')::int);
    WHEN 'brand_missing'           THEN RETURN public.p_brand_missing(_uid);
    WHEN 'milestone_reached'       THEN RETURN public.p_milestone_reached(_uid, _arg);
    ELSE                                RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rule_satisfied(_rule_id uuid, _uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rp record;
  ok boolean;
  found_any boolean := false;
BEGIN
  FOR rp IN
    SELECT p.handler, rp2.argument
      FROM public.progression_rule_predicates rp2
      JOIN public.progression_predicates p ON p.id = rp2.predicate_id
     WHERE rp2.rule_id = _rule_id
     ORDER BY rp2.evaluation_order ASC
  LOOP
    found_any := true;
    ok := public.evaluate_predicate(rp.handler, _uid, rp.argument);
    IF NOT ok THEN RETURN false; END IF;
  END LOOP;
  RETURN found_any;   -- rules with no junction predicates are not satisfied by this path
END;
$$;
GRANT EXECUTE ON FUNCTION public.rule_satisfied(uuid, uuid) TO authenticated, service_role;

-- Public milestone progress helper for the UI (frontend never computes percentages)
CREATE OR REPLACE FUNCTION public.progression_milestone_progress(_uid uuid, _slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.progression_milestones;
  v int;
BEGIN
  SELECT * INTO m FROM public.progression_milestones WHERE slug = _slug;
  IF NOT FOUND THEN RETURN jsonb_build_object('slug', _slug, 'found', false); END IF;

  IF m.scope = 'USER' AND m.metric = 'paid_missions' AND m.aggregation = 'COUNT' THEN
    v := public.p_paid_missions_count(_uid);
  ELSE
    v := 0;
  END IF;

  RETURN jsonb_build_object(
    'slug', m.slug,
    'metric', m.metric,
    'aggregation', m.aggregation,
    'scope', m.scope,
    'current_value', v,
    'threshold', m.threshold,
    'percent_complete', LEAST(100, ROUND((v::numeric / GREATEST(m.threshold,1)) * 100)::int)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.progression_milestone_progress(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Extend recompute_progression to ALSO consider junction predicates
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_progression(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  v_has_junction boolean;
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
    -- Junction-based rules use rule_satisfied(); legacy jsonb rules use the classic checks.
    SELECT EXISTS (SELECT 1 FROM public.progression_rule_predicates WHERE rule_id = r.id)
      INTO v_has_junction;

    IF v_has_junction THEN
      v_ok := public.rule_satisfied(r.id, _user_id);
    ELSE
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
    END IF;

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
END $function$;

-- -----------------------------------------------------------------------------
-- 5. Seed Growth Journey rules via junction (no jsonb condition parsing)
-- -----------------------------------------------------------------------------

WITH ins AS (
  INSERT INTO public.progression_rules
    (name, source_stage, target_stage, condition, priority, action_type, action_payload, enabled)
  VALUES
    ('consulting_growth_start',
      'capable', 'consulting_growth', '{}'::jsonb, 10, 'open_link',
      jsonb_build_object('label','Grow your consulting practice',
                         'link','/consulting-growth','category','revenue'),
      true),
    ('first_ten_missions_milestone',
      'consulting_growth', 'consulting_growth', '{}'::jsonb, 12, 'open_link',
      jsonb_build_object('label','Reach 10 paid missions',
                         'link','/consulting-growth','category','revenue'),
      true),
    ('brand_growth_start',
      'consulting_growth', 'brand_growth', '{}'::jsonb, 15, 'open_link',
      jsonb_build_object('label','Launch your brand entity',
                         'link','/brand-entity','category','venture'),
      true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id, name
)
INSERT INTO public.progression_rule_predicates (rule_id, predicate_id, argument, evaluation_order)
SELECT r.id, p.id, t.arg, t.ord
FROM (
  VALUES
    ('consulting_growth_start'::text,      'onboarding_completed'::text, NULL::text,           1),
    ('first_ten_missions_milestone',       'onboarding_completed',       NULL,                 1),
    ('first_ten_missions_milestone',       'milestone_reached',          'first_ten_missions', 2),
    ('brand_growth_start',                 'milestone_reached',          'first_ten_missions', 1),
    ('brand_growth_start',                 'brand_missing',              NULL,                 2)
) AS t(rname, pslug, arg, ord)
JOIN ins r ON r.name = t.rname
JOIN public.progression_predicates p ON p.slug = t.pslug;

-- -----------------------------------------------------------------------------
-- 6. Bootstrap helper for B4 seeding (called by an edge function with service role)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bootstrap_system_principal(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b4_org_id uuid;
  principal_id uuid;
BEGIN
  -- Only callable via service role (edge function). Belt & braces: also require _user_id.
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') NOT IN ('service_role', NULL) THEN
    -- allow when role is service_role; also allow when there is no jwt (server-side psql/edge)
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') <> 'service_role' THEN
      RAISE EXCEPTION 'service_role_only';
    END IF;
  END IF;

  INSERT INTO public.platform_principals (slug, user_id, description)
  VALUES ('system', _user_id, 'Platform service account for system organizations')
  ON CONFLICT (slug) DO UPDATE SET user_id = EXCLUDED.user_id
  RETURNING id INTO principal_id;

  SELECT id INTO b4_org_id FROM public.organizations WHERE slug = 'b4';
  IF b4_org_id IS NULL THEN
    INSERT INTO public.organizations (slug, name, type, created_by, lifecycle_stage)
    VALUES ('b4', 'B4', 'system', _user_id, 'mature')
    RETURNING id INTO b4_org_id;
  END IF;

  INSERT INTO public.platform_partners
    (slug, organization_id, relationship_type, default_assignment_role, priority, active)
  VALUES
    ('b4', b4_org_id, 'inspiring_advisor', 'inspiring_advisor', 1, true)
  ON CONFLICT (slug) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    relationship_type = EXCLUDED.relationship_type,
    default_assignment_role = EXCLUDED.default_assignment_role,
    active = true;

  RETURN jsonb_build_object('principal_id', principal_id, 'b4_org_id', b4_org_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bootstrap_system_principal(uuid) TO service_role;
