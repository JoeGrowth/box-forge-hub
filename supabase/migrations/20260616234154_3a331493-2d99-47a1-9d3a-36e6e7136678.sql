
-- ============================================================
-- PHASE 1: GRAPH PLATFORM FOUNDATION
-- graph_events (log) -> graph_nodes + graph_edges -> expertise_graph (projection)
-- ============================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.graph_node_type AS ENUM (
    'user', 'skill', 'certification', 'training', 'consulting_service',
    'startup', 'tender', 'venture', 'job', 'box'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.graph_edge_type AS ENUM (
    'HAS_SKILL', 'HAS_CERTIFICATION', 'CONTRIBUTED_TO', 'DELIVERED',
    'ENGAGED_IN', 'APPLIED_TO', 'OWNS_EQUITY_IN', 'CREATED', 'COMPLETED',
    'MEMBER_OF', 'PUBLISHED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.graph_event_type AS ENUM (
    'skill_added', 'skill_removed',
    'certification_earned', 'certification_verified',
    'startup_contribution_accepted', 'startup_member_added',
    'training_delivered', 'training_published',
    'consulting_engagement_completed', 'consulting_service_published',
    'tender_won', 'tender_published',
    'venture_created', 'equity_vested',
    'journey_completed', 'job_published', 'job_applied'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- graph_events (append-only log) ----------
CREATE TABLE IF NOT EXISTS public.graph_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  event_type      public.graph_event_type NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  source_module   text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  weight          numeric NOT NULL DEFAULT 1,
  version         integer NOT NULL DEFAULT 1,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  processing_error text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_events_user ON public.graph_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_events_unprocessed ON public.graph_events(occurred_at)
  WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_graph_events_aggregate ON public.graph_events(aggregate_type, aggregate_id);

GRANT SELECT, INSERT ON public.graph_events TO authenticated;
GRANT ALL ON public.graph_events TO service_role;

ALTER TABLE public.graph_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON public.graph_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
  ON public.graph_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.graph_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- graph_nodes ----------
CREATE TABLE IF NOT EXISTS public.graph_nodes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type    public.graph_node_type NOT NULL,
  external_id  text NOT NULL,
  label        text,
  attributes   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON public.graph_nodes(node_type);

GRANT SELECT ON public.graph_nodes TO authenticated;
GRANT ALL ON public.graph_nodes TO service_role;

ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read graph nodes"
  ON public.graph_nodes FOR SELECT TO authenticated USING (true);

-- ---------- graph_edges ----------
CREATE TABLE IF NOT EXISTS public.graph_edges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id  uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  to_node_id    uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  edge_type     public.graph_edge_type NOT NULL,
  weight        numeric NOT NULL DEFAULT 1,
  attributes    jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_event_id uuid REFERENCES public.graph_events(id) ON DELETE SET NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_node_id, to_node_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON public.graph_edges(from_node_id, edge_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON public.graph_edges(to_node_id, edge_type);

GRANT SELECT ON public.graph_edges TO authenticated;
GRANT ALL ON public.graph_edges TO service_role;

ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read graph edges"
  ON public.graph_edges FOR SELECT TO authenticated USING (true);

-- ---------- expertise_graph (first projection) ----------
CREATE TABLE IF NOT EXISTS public.expertise_graph (
  user_id                   uuid PRIMARY KEY,
  expertise_score           numeric NOT NULL DEFAULT 0,
  expertise_tags            text[]  NOT NULL DEFAULT '{}',
  expertise_level           text    NOT NULL DEFAULT 'novice',
  verified_expertise_count  integer NOT NULL DEFAULT 0,
  monetizable_expertise     jsonb   NOT NULL DEFAULT '{}'::jsonb,
  source_event_version      bigint  NOT NULL DEFAULT 0,
  computed_at               timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expertise_graph_score ON public.expertise_graph(expertise_score DESC);

GRANT SELECT ON public.expertise_graph TO authenticated;
GRANT ALL ON public.expertise_graph TO service_role;

ALTER TABLE public.expertise_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expertise projections"
  ON public.expertise_graph FOR SELECT TO authenticated USING (true);

-- ---------- updated_at triggers ----------
DROP TRIGGER IF EXISTS trg_graph_nodes_updated_at ON public.graph_nodes;
CREATE TRIGGER trg_graph_nodes_updated_at
  BEFORE UPDATE ON public.graph_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_expertise_graph_updated_at ON public.expertise_graph;
CREATE TRIGGER trg_expertise_graph_updated_at
  BEFORE UPDATE ON public.expertise_graph
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- helper: upsert node ----------
CREATE OR REPLACE FUNCTION public.graph_upsert_node(
  _node_type public.graph_node_type,
  _external_id text,
  _label text,
  _attributes jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.graph_nodes (node_type, external_id, label, attributes)
  VALUES (_node_type, _external_id, _label, COALESCE(_attributes, '{}'::jsonb))
  ON CONFLICT (node_type, external_id)
  DO UPDATE SET label = EXCLUDED.label,
                attributes = public.graph_nodes.attributes || EXCLUDED.attributes,
                updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.graph_upsert_node(public.graph_node_type, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.graph_upsert_node(public.graph_node_type, text, text, jsonb) TO service_role;

-- ---------- helper: upsert edge ----------
CREATE OR REPLACE FUNCTION public.graph_upsert_edge(
  _from uuid, _to uuid, _edge_type public.graph_edge_type,
  _weight numeric, _attributes jsonb, _source_event_id uuid, _occurred_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.graph_edges (from_node_id, to_node_id, edge_type, weight, attributes, source_event_id, occurred_at)
  VALUES (_from, _to, _edge_type, COALESCE(_weight,1), COALESCE(_attributes,'{}'::jsonb), _source_event_id, COALESCE(_occurred_at, now()))
  ON CONFLICT (from_node_id, to_node_id, edge_type)
  DO UPDATE SET weight = EXCLUDED.weight,
                attributes = public.graph_edges.attributes || EXCLUDED.attributes,
                occurred_at = EXCLUDED.occurred_at
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.graph_upsert_edge(uuid, uuid, public.graph_edge_type, numeric, jsonb, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.graph_upsert_edge(uuid, uuid, public.graph_edge_type, numeric, jsonb, uuid, timestamptz) TO service_role;

-- ---------- projection: recompute expertise for a single user ----------
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
BEGIN
  -- ensure user node exists
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  -- aggregate edge counts
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

  -- collect tags from connected skill/cert nodes
  SELECT COALESCE(array_agg(DISTINCT n.label) FILTER (WHERE n.label IS NOT NULL), '{}')
    INTO v_tags
    FROM public.graph_edges e
    JOIN public.graph_nodes n ON n.id = e.to_node_id
    WHERE e.from_node_id = v_user_node
      AND e.edge_type IN ('HAS_SKILL','HAS_CERTIFICATION');

  -- transparent scoring: tunable later, intentionally simple
  v_score :=
      (v_skill_count * 1.0)
    + (v_cert_count * 3.0)
    + (v_verified_count * 2.0)
    + (v_contrib_count * 5.0)
    + (v_delivered_count * 4.0)
    + (v_engaged_count * 3.0);

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
    verified_expertise_count, monetizable_expertise, source_event_version, computed_at
  ) VALUES (
    _user_id, v_score, v_tags, v_level, v_verified_count,
    jsonb_build_object(
      'skills', v_skill_count,
      'certifications', v_cert_count,
      'contributions', v_contrib_count,
      'trainings_delivered', v_delivered_count,
      'consulting_engagements', v_engaged_count
    ),
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    expertise_score = EXCLUDED.expertise_score,
    expertise_tags = EXCLUDED.expertise_tags,
    expertise_level = EXCLUDED.expertise_level,
    verified_expertise_count = EXCLUDED.verified_expertise_count,
    monetizable_expertise = EXCLUDED.monetizable_expertise,
    source_event_version = EXCLUDED.source_event_version,
    computed_at = EXCLUDED.computed_at;
END $$;

REVOKE ALL ON FUNCTION public.recompute_expertise(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_expertise(uuid) TO service_role;
