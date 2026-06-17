
-- ============================================================
-- Phase 2.1 / 2.2 — Trust Graph enums
-- ============================================================
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'review_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'transaction_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'training_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'consulting_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'job_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'startup_contribution_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'milestone_completed';

ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'transaction';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'achievement';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'organization';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'project';

ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_RECEIVED_CERTIFICATION';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_COMPLETED_TRANSACTION';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_RECEIVED_REVIEW';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_COMPLETED_PROJECT';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_DELIVERED_OUTCOME';

-- ============================================================
-- Phase 2.3 — trust_graph projection
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_graph (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trust_score          numeric NOT NULL DEFAULT 0,
  verification_level   text    NOT NULL DEFAULT 'unverified',
  verified_count       int     NOT NULL DEFAULT 0,
  review_score         numeric NOT NULL DEFAULT 0,   -- 0..5 weighted avg
  completion_score     numeric NOT NULL DEFAULT 0,   -- sum of completion points
  trust_breakdown      jsonb   NOT NULL DEFAULT '{}'::jsonb,
  source_event_version bigint  NOT NULL DEFAULT 0,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trust_graph TO authenticated;
GRANT ALL    ON public.trust_graph TO service_role;

ALTER TABLE public.trust_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_graph readable by authenticated"
  ON public.trust_graph
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trust_graph_set_updated_at
BEFORE UPDATE ON public.trust_graph
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Phase 2.3 — recompute_trust(user) — explainable projection
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_trust(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_node uuid;
  v_verified_certs int := 0;
  v_completed_contribs int := 0;     -- startup contributions explicitly completed
  v_completed_projects int := 0;     -- USER_COMPLETED_PROJECT
  v_completed_tx int := 0;           -- USER_COMPLETED_TRANSACTION
  v_delivered_outcomes int := 0;     -- USER_DELIVERED_OUTCOME
  v_review_count int := 0;
  v_review_avg numeric := 0;
  v_score numeric;
  v_completion_score numeric;
  v_level text;
  v_max_version bigint;
  v_breakdown jsonb;
  -- weights (kept conservative — Trust is evidence, not hype)
  v_w_cert    numeric := 10.0;
  v_w_contrib numeric := 5.0;
  v_w_project numeric := 5.0;
  v_w_tx      numeric := 4.0;
  v_w_outcome numeric := 4.0;
  v_w_review  numeric := 5.0;        -- multiplied by avg rating (0..5)
BEGIN
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  -- Verified credentials: count HAS_CERTIFICATION edges flagged verified=true
  -- AND/OR the new canonical USER_RECEIVED_CERTIFICATION edge (forward-compat).
  SELECT COUNT(*) INTO v_verified_certs
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node
     AND (
       (e.edge_type = 'HAS_CERTIFICATION'
        AND COALESCE((e.attributes->>'verified')::boolean, false) = true)
       OR e.edge_type = 'USER_RECEIVED_CERTIFICATION'
     );

  -- Completed startup contributions (event: startup_contribution_completed).
  -- Encoded as CONTRIBUTED_TO with attributes.completed=true OR
  -- the canonical USER_COMPLETED_PROJECT edge targeting a startup.
  SELECT COUNT(DISTINCT e.to_node_id) INTO v_completed_contribs
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node
     AND (
       (e.edge_type = 'CONTRIBUTED_TO'
        AND COALESCE((e.attributes->>'completed')::boolean, false) = true)
     );

  SELECT COUNT(*) INTO v_completed_projects
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_COMPLETED_PROJECT';

  SELECT COUNT(*) INTO v_completed_tx
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_COMPLETED_TRANSACTION';

  SELECT COUNT(*) INTO v_delivered_outcomes
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_DELIVERED_OUTCOME';

  -- Reviews: USER_RECEIVED_REVIEW edges carry attributes.rating (0..5)
  SELECT COUNT(*), COALESCE(AVG((e.attributes->>'rating')::numeric), 0)
    INTO v_review_count, v_review_avg
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_RECEIVED_REVIEW';

  v_completion_score :=
      (v_completed_contribs  * v_w_contrib)
    + (v_completed_projects  * v_w_project)
    + (v_completed_tx        * v_w_tx)
    + (v_delivered_outcomes  * v_w_outcome);

  v_score :=
      (v_verified_certs * v_w_cert)
    + v_completion_score
    + (v_review_avg * v_w_review);

  v_level := CASE
    WHEN v_verified_certs >= 3 OR v_score >= 60 THEN 'trusted'
    WHEN v_verified_certs >= 2 OR v_score >= 30 THEN 'verified'
    WHEN v_verified_certs >= 1 OR v_score >= 10 THEN 'basic'
    ELSE 'unverified'
  END;

  v_breakdown := jsonb_build_object(
    'certifications',        jsonb_build_object('count', v_verified_certs,     'weight', v_w_cert,    'points', v_verified_certs    * v_w_cert),
    'completed_contributions', jsonb_build_object('count', v_completed_contribs,'weight', v_w_contrib, 'points', v_completed_contribs * v_w_contrib),
    'completed_projects',    jsonb_build_object('count', v_completed_projects, 'weight', v_w_project, 'points', v_completed_projects * v_w_project),
    'completed_transactions',jsonb_build_object('count', v_completed_tx,       'weight', v_w_tx,      'points', v_completed_tx       * v_w_tx),
    'delivered_outcomes',    jsonb_build_object('count', v_delivered_outcomes, 'weight', v_w_outcome, 'points', v_delivered_outcomes * v_w_outcome),
    'reviews',               jsonb_build_object('count', v_review_count,       'average', v_review_avg, 'weight', v_w_review,        'points', v_review_avg * v_w_review)
  );

  SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.trust_graph (
    user_id, trust_score, verification_level, verified_count,
    review_score, completion_score, trust_breakdown,
    source_event_version, computed_at
  ) VALUES (
    _user_id, v_score, v_level, v_verified_certs,
    v_review_avg, v_completion_score, v_breakdown,
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trust_score          = EXCLUDED.trust_score,
    verification_level   = EXCLUDED.verification_level,
    verified_count       = EXCLUDED.verified_count,
    review_score         = EXCLUDED.review_score,
    completion_score     = EXCLUDED.completion_score,
    trust_breakdown      = EXCLUDED.trust_breakdown,
    source_event_version = EXCLUDED.source_event_version,
    computed_at          = EXCLUDED.computed_at;
END $$;
