
-- ============================================================
-- GATE 1 — Event Contract Versioning
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      public.graph_event_type NOT NULL,
  event_version   integer NOT NULL DEFAULT 1,
  source_module   text NOT NULL,
  description     text,
  payload_schema  jsonb NOT NULL DEFAULT '{}'::jsonb,
  deprecated      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, event_version)
);

GRANT SELECT ON public.event_catalog TO authenticated;
GRANT ALL ON public.event_catalog TO service_role;

ALTER TABLE public.event_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read event catalog"
  ON public.event_catalog FOR SELECT TO authenticated USING (true);

-- Seed v1 contracts (idempotent)
INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema) VALUES
 ('skill_added','1','profile.skills','User added a skill','{"required":["skill_id"],"properties":{"skill_id":{"type":"string"},"skill_name":{"type":"string"}}}'),
 ('skill_removed','1','profile.skills','User removed a skill','{"required":["skill_id"],"properties":{"skill_id":{"type":"string"},"skill_name":{"type":"string"}}}'),
 ('certification_earned','1','learning.journey','User earned a certification','{"required":["certification_type"],"properties":{"certification_type":{"type":"string"},"certification_label":{"type":"string"},"verified":{"type":"boolean"}}}'),
 ('certification_verified','1','admin.approvals','Admin verified a certification','{"required":["certification_type"],"properties":{"certification_type":{"type":"string"},"certification_label":{"type":"string"}}}'),
 ('startup_contribution_accepted','1','idea.team','Applicant accepted onto a startup','{"required":["startup_id"],"properties":{"startup_id":{"type":"string"},"startup_title":{"type":"string"},"role":{"type":"string"},"equity":{"type":"number"}}}'),
 ('startup_member_added','1','idea.team','User added as startup team member','{"required":["startup_id"],"properties":{"startup_id":{"type":"string"},"startup_title":{"type":"string"}}}'),
 ('training_delivered','1','training','User delivered a training session','{"required":["training_id"],"properties":{"training_id":{"type":"string"},"training_title":{"type":"string"}}}'),
 ('training_published','1','training','User published a training offer','{"required":["training_id"],"properties":{"training_id":{"type":"string"},"training_title":{"type":"string"}}}'),
 ('consulting_engagement_completed','1','consulting','User completed a consulting engagement','{"required":["service_id"],"properties":{"service_id":{"type":"string"},"service_title":{"type":"string"}}}'),
 ('consulting_service_published','1','consulting','User published a consulting service','{"required":["service_id"],"properties":{"service_id":{"type":"string"},"service_title":{"type":"string"}}}'),
 ('tender_won','1','procuring','User won a tender','{"required":["tender_id"],"properties":{"tender_id":{"type":"string"},"tender_title":{"type":"string"}}}'),
 ('tender_published','1','procuring','User published a tender','{"required":["tender_id"],"properties":{"tender_id":{"type":"string"},"tender_title":{"type":"string"}}}'),
 ('venture_created','1','scaling','User created a venture','{"required":["venture_id"],"properties":{"venture_id":{"type":"string"},"venture_name":{"type":"string"}}}'),
 ('equity_vested','1','scaling','Equity vested for user','{"required":["startup_id","equity"],"properties":{"startup_id":{"type":"string"},"startup_title":{"type":"string"},"equity":{"type":"number"},"vested_at":{"type":"string"}}}'),
 ('journey_completed','1','learning.journey','User completed a learning journey','{"required":["journey_id"],"properties":{"journey_id":{"type":"string"},"journey_label":{"type":"string"}}}'),
 ('job_published','1','jobs','User published a job','{"required":["job_id"],"properties":{"job_id":{"type":"string"},"job_title":{"type":"string"}}}'),
 ('job_applied','1','jobs','User applied to a job','{"required":["job_id"],"properties":{"job_id":{"type":"string"},"job_title":{"type":"string"}}}')
ON CONFLICT (event_type, event_version) DO UPDATE
  SET source_module = EXCLUDED.source_module,
      description = EXCLUDED.description,
      payload_schema = EXCLUDED.payload_schema;

-- ============================================================
-- GATE 2 — Idempotency + Versioning on graph_events
-- ============================================================
ALTER TABLE public.graph_events
  ADD COLUMN IF NOT EXISTS event_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.graph_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_graph_events_idempotency
  ON public.graph_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Validation trigger: reject events whose (event_type, event_version) is
-- not registered in event_catalog. Trigger (not CHECK) per project rules.
CREATE OR REPLACE FUNCTION public.validate_graph_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.event_catalog c
    WHERE c.event_type = NEW.event_type
      AND c.event_version = NEW.event_version
      AND c.deprecated = false
  ) THEN
    RAISE EXCEPTION 'graph_events: unregistered or deprecated contract (% v%)',
      NEW.event_type, NEW.event_version;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_graph_event ON public.graph_events;
CREATE TRIGGER trg_validate_graph_event
  BEFORE INSERT ON public.graph_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_graph_event();

-- ============================================================
-- EXPLAINABILITY — score_breakdown on expertise_graph
-- ============================================================
ALTER TABLE public.expertise_graph
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Recompute now also writes score_breakdown.
CREATE OR REPLACE FUNCTION public.recompute_expertise(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_node uuid;
  v_skill_count int := 0;
  v_cert_count int := 0;
  v_verified_count int := 0;
  v_contrib_count int := 0;
  v_delivered_count int := 0;
  v_engaged_count int := 0;
  v_tags text[];
  v_score numeric;
  v_level text;
  v_max_version bigint;
  v_breakdown jsonb;
  v_w_skill numeric := 1.0;
  v_w_cert  numeric := 3.0;
  v_w_verif numeric := 2.0;
  v_w_contrib numeric := 5.0;
  v_w_deliv  numeric := 4.0;
  v_w_engag  numeric := 3.0;
BEGIN
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT COUNT(*) INTO v_skill_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_SKILL';
  SELECT COUNT(*) INTO v_cert_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_CERTIFICATION';
  SELECT COUNT(*) INTO v_verified_count
    FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_CERTIFICATION'
      AND COALESCE((e.attributes->>'verified')::boolean, false) = true;
  SELECT COUNT(*) INTO v_contrib_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'CONTRIBUTED_TO';
  SELECT COUNT(*) INTO v_delivered_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'DELIVERED';
  SELECT COUNT(*) INTO v_engaged_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'ENGAGED_IN';

  SELECT COALESCE(array_agg(DISTINCT n.label) FILTER (WHERE n.label IS NOT NULL), '{}')
    INTO v_tags
    FROM public.graph_edges e
    JOIN public.graph_nodes n ON n.id = e.to_node_id
    WHERE e.from_node_id = v_user_node
      AND e.edge_type IN ('HAS_SKILL','HAS_CERTIFICATION');

  v_breakdown := jsonb_build_object(
    'skills',                jsonb_build_object('count', v_skill_count,    'weight', v_w_skill,  'points', v_skill_count    * v_w_skill),
    'certifications',        jsonb_build_object('count', v_cert_count,     'weight', v_w_cert,   'points', v_cert_count     * v_w_cert),
    'verified_certifications', jsonb_build_object('count', v_verified_count,'weight', v_w_verif,  'points', v_verified_count * v_w_verif),
    'startup_contributions', jsonb_build_object('count', v_contrib_count,  'weight', v_w_contrib,'points', v_contrib_count  * v_w_contrib),
    'trainings_delivered',   jsonb_build_object('count', v_delivered_count,'weight', v_w_deliv,  'points', v_delivered_count* v_w_deliv),
    'consulting_engagements',jsonb_build_object('count', v_engaged_count,  'weight', v_w_engag,  'points', v_engaged_count  * v_w_engag)
  );

  v_score :=
      (v_skill_count    * v_w_skill)
    + (v_cert_count     * v_w_cert)
    + (v_verified_count * v_w_verif)
    + (v_contrib_count  * v_w_contrib)
    + (v_delivered_count* v_w_deliv)
    + (v_engaged_count  * v_w_engag);

  v_level := CASE
    WHEN v_score >= 50 THEN 'expert'
    WHEN v_score >= 20 THEN 'advanced'
    WHEN v_score >= 8  THEN 'intermediate'
    WHEN v_score >  0  THEN 'emerging'
    ELSE 'novice'
  END;

  SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.expertise_graph (
    user_id, expertise_score, expertise_tags, expertise_level,
    verified_expertise_count, monetizable_expertise, score_breakdown,
    source_event_version, computed_at
  ) VALUES (
    _user_id, v_score, v_tags, v_level, v_verified_count,
    jsonb_build_object(
      'skills', v_skill_count,
      'certifications', v_cert_count,
      'contributions', v_contrib_count,
      'trainings_delivered', v_delivered_count,
      'consulting_engagements', v_engaged_count
    ),
    v_breakdown,
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    expertise_score = EXCLUDED.expertise_score,
    expertise_tags = EXCLUDED.expertise_tags,
    expertise_level = EXCLUDED.expertise_level,
    verified_expertise_count = EXCLUDED.verified_expertise_count,
    monetizable_expertise = EXCLUDED.monetizable_expertise,
    score_breakdown = EXCLUDED.score_breakdown,
    source_event_version = EXCLUDED.source_event_version,
    computed_at = EXCLUDED.computed_at;
END $$;

-- ============================================================
-- PARITY HELPER — legacy expertise calculation from raw tables
-- Used by the parity test before UI migration.
-- ============================================================
CREATE OR REPLACE FUNCTION public.legacy_expertise_calc(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_skills int := 0;
  v_certs int := 0;
  v_verified int := 0;
  v_contribs int := 0;
  v_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_skills FROM public.user_skills WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_certs FROM public.user_certifications WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_verified FROM public.user_certifications WHERE user_id = _user_id AND verified = true;
  SELECT COUNT(*) INTO v_contribs FROM public.startup_team_members WHERE user_id = _user_id;

  v_score := (v_skills * 1.0) + (v_certs * 3.0) + (v_verified * 2.0) + (v_contribs * 5.0);

  RETURN jsonb_build_object(
    'skills', v_skills,
    'certifications', v_certs,
    'verified', v_verified,
    'contributions', v_contribs,
    'score_partial', v_score
  );
END $$;

REVOKE ALL ON FUNCTION public.legacy_expertise_calc(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legacy_expertise_calc(uuid) TO service_role;
