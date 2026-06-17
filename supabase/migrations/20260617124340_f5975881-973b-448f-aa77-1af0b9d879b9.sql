
-- =========================================================================
-- PHASE A: Convergent Graph Hierarchy (schema + integrity only) — v2
-- =========================================================================

-- ---- 1. Extend edge enum -------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'graph_edge_type' AND e.enumlabel = 'USER_PRACTICE_EXPERIENCE') THEN
    ALTER TYPE public.graph_edge_type ADD VALUE 'USER_PRACTICE_EXPERIENCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'graph_edge_type' AND e.enumlabel = 'USER_TRAINING_EXPERIENCE') THEN
    ALTER TYPE public.graph_edge_type ADD VALUE 'USER_TRAINING_EXPERIENCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'graph_edge_type' AND e.enumlabel = 'USER_CONSULTING_EXPERIENCE') THEN
    ALTER TYPE public.graph_edge_type ADD VALUE 'USER_CONSULTING_EXPERIENCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'graph_edge_type' AND e.enumlabel = 'ROLE_AFFINITY') THEN
    ALTER TYPE public.graph_edge_type ADD VALUE 'ROLE_AFFINITY';
  END IF;
END $$;

-- ---- 2. graph_edges: validated + confidence ------------------------------
ALTER TABLE public.graph_edges
  ADD COLUMN IF NOT EXISTS validated  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) NOT NULL DEFAULT 0.30
    CHECK (confidence >= 0 AND confidence <= 1);

COMMENT ON COLUMN public.graph_edges.validated  IS
  'Experience edges only contribute to NRD inference when validated = true. Worker-controlled.';
COMMENT ON COLUMN public.graph_edges.confidence IS
  'Per-edge confidence 0..1. Experience layer bumps confidence on existing skill edges.';

-- ---- 3. expertise_graph: convergent confidence (monotonic) ---------------
ALTER TABLE public.expertise_graph
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) NOT NULL DEFAULT 0
    CHECK (confidence >= 0 AND confidence <= 1);

COMMENT ON COLUMN public.expertise_graph.confidence IS
  'Single convergent scalar 0..1. Sole driver of entrepreneurial unlock. Monotonic.';

CREATE OR REPLACE FUNCTION public.enforce_expertise_confidence_monotonic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.confidence < OLD.confidence THEN
    NEW.confidence := OLD.confidence;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_expertise_confidence_monotonic ON public.expertise_graph;
CREATE TRIGGER trg_expertise_confidence_monotonic
  BEFORE UPDATE ON public.expertise_graph
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expertise_confidence_monotonic();

-- ---- 4. natural_roles: demote to weak prior ------------------------------
ALTER TABLE public.natural_roles
  ADD COLUMN IF NOT EXISTS is_self_declared  boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weak_prior_weight numeric(3,2) NOT NULL DEFAULT 0.10
    CHECK (weak_prior_weight >= 0 AND weak_prior_weight <= 0.10);

COMMENT ON COLUMN public.natural_roles.is_self_declared IS
  'User-authored NRD answers are weak priors only — never the source of role truth.';
COMMENT ON COLUMN public.natural_roles.weak_prior_weight IS
  'Hard-capped at 0.10.';

CREATE OR REPLACE FUNCTION public.cap_natural_role_weak_prior()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF NEW.weak_prior_weight IS NULL OR NEW.weak_prior_weight > 0.10 THEN
    NEW.weak_prior_weight := 0.10;
  ELSIF NEW.weak_prior_weight < 0 THEN
    NEW.weak_prior_weight := 0;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_natural_roles_cap_weak_prior ON public.natural_roles;
CREATE TRIGGER trg_natural_roles_cap_weak_prior
  BEFORE INSERT OR UPDATE ON public.natural_roles
  FOR EACH ROW EXECUTE FUNCTION public.cap_natural_role_weak_prior();

-- ---- 5. role_affinity_projection (worker-only writes) --------------------
DO $$ BEGIN
  CREATE TYPE public.role_affinity_kind AS ENUM ('builder','strategist','operator','connector');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.role_affinity_projection (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  role                 public.role_affinity_kind NOT NULL,
  score                numeric(4,3) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  evidence_edges       jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  source_event_version bigint,
  UNIQUE (user_id, role)
);

COMMENT ON TABLE public.role_affinity_projection IS
  'Sole source of NRD role truth. Worker-derived from validated graph edges only.';

CREATE INDEX IF NOT EXISTS idx_role_affinity_user ON public.role_affinity_projection(user_id);

GRANT SELECT ON public.role_affinity_projection TO authenticated;
GRANT ALL    ON public.role_affinity_projection TO service_role;

ALTER TABLE public.role_affinity_projection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_affinity_read_own"
  ON public.role_affinity_projection FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "role_affinity_read_admin"
  ON public.role_affinity_projection FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---- 6. Entrepreneurial unlock RPC (sole gate) ---------------------------
-- NOTE: edge_type cast to text to avoid Postgres restriction on referencing
-- newly-added enum values inside the same migration.
CREATE OR REPLACE FUNCTION public.can_access_entrepreneurial_layer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    COALESCE(
      (SELECT confidence FROM public.expertise_graph WHERE user_id = _user_id) >= 0.60,
      false
    )
    AND EXISTS (
      SELECT 1
      FROM public.graph_edges e
      JOIN public.graph_nodes n ON n.id = e.from_node_id
      WHERE n.node_type = 'user'
        AND n.external_id = _user_id::text
        AND e.edge_type::text IN (
          'USER_PRACTICE_EXPERIENCE',
          'USER_TRAINING_EXPERIENCE',
          'USER_CONSULTING_EXPERIENCE'
        )
        AND e.validated = true
    );
$fn$;

COMMENT ON FUNCTION public.can_access_entrepreneurial_layer(uuid) IS
  'Sole gate for entrepreneurial layer. True iff expertise_graph.confidence >= 0.6 AND >=1 validated experience edge.';

GRANT EXECUTE ON FUNCTION public.can_access_entrepreneurial_layer(uuid) TO authenticated, service_role;

-- ---- 7. Index for unlock-RPC perf ---------------------------------------
CREATE INDEX IF NOT EXISTS idx_graph_edges_validated_type
  ON public.graph_edges (from_node_id, edge_type)
  WHERE validated = true;
