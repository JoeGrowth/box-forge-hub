
-- ================================================================
-- Opportunity Lifecycle Graph (state machine projection)
-- ================================================================
-- One row per (user_id, category, opportunity_id). Synthesizes
-- behavioral events (view/save/apply) and application status
-- transitions into a single canonical state. Highest-rank state wins;
-- terminal branches (rejected/withdrawn) are recorded but do not
-- overwrite a later positive transition.

CREATE TABLE IF NOT EXISTS public.opportunity_lifecycle_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  opportunity_id text NOT NULL,
  state text NOT NULL DEFAULT 'discovered',
  state_rank int NOT NULL DEFAULT 0,
  application_id uuid,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  saved_at timestamptz,
  applied_at timestamptz,
  reviewing_at timestamptz,
  shortlisted_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  last_event_id uuid,
  last_event_type text,
  last_event_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, opportunity_id)
);

GRANT SELECT ON public.opportunity_lifecycle_graph TO authenticated;
GRANT ALL ON public.opportunity_lifecycle_graph TO service_role;

ALTER TABLE public.opportunity_lifecycle_graph ENABLE ROW LEVEL SECURITY;

-- Users see their own rows
CREATE POLICY "olg_select_own"
  ON public.opportunity_lifecycle_graph FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Owners of the opportunity (via applications.owner_id) can see lifecycle rows on their opps
CREATE POLICY "olg_select_owner"
  ON public.opportunity_lifecycle_graph FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.opportunity_id::text = opportunity_lifecycle_graph.opportunity_id
        AND a.opportunity_type::text = opportunity_lifecycle_graph.category
        AND a.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.startup_ideas s
      WHERE opportunity_lifecycle_graph.category = 'startup'
        AND s.id::text = opportunity_lifecycle_graph.opportunity_id
        AND s.creator_id = auth.uid()
    )
  );

-- Admins
CREATE POLICY "olg_select_admin"
  ON public.opportunity_lifecycle_graph FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_olg_user ON public.opportunity_lifecycle_graph(user_id, state);
CREATE INDEX IF NOT EXISTS idx_olg_opp ON public.opportunity_lifecycle_graph(category, opportunity_id);
CREATE INDEX IF NOT EXISTS idx_olg_state ON public.opportunity_lifecycle_graph(state);

-- ----------------------------------------------------------------
-- Rank helper: canonical ordering of lifecycle states
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunity_lifecycle_rank(_state text)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _state
    WHEN 'discovered'  THEN 0
    WHEN 'viewed'      THEN 10
    WHEN 'saved'       THEN 20
    WHEN 'applied'     THEN 30
    WHEN 'reviewing'   THEN 40
    WHEN 'shortlisted' THEN 50
    WHEN 'withdrawn'   THEN 55
    WHEN 'rejected'    THEN 55
    WHEN 'accepted'    THEN 60
    WHEN 'completed'   THEN 70
    ELSE 0
  END
$$;

-- ----------------------------------------------------------------
-- Projection function: graph_events → opportunity_lifecycle_graph
-- Trigger AFTER INSERT on graph_events. Listens to:
--   user_viewed_opportunity, user_saved_opportunity,
--   user_applied_opportunity, application_*, opportunity_completed
-- Cross-category normalization happens here.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_opportunity_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := NEW.user_id;
  v_category text;
  v_opp_id text;
  v_app_id uuid;
  v_new_state text;
  v_new_rank int;
  v_ts timestamptz := NEW.occurred_at;
  v_evt text := NEW.event_type::text;
BEGIN
  -- Map event → (category, opportunity_id, new_state)
  IF v_evt IN ('user_viewed_opportunity','user_saved_opportunity','user_applied_opportunity') THEN
    v_category := COALESCE(NEW.payload->>'category', NULL);
    v_opp_id   := NEW.aggregate_id;
    v_new_state := CASE v_evt
      WHEN 'user_viewed_opportunity'  THEN 'viewed'
      WHEN 'user_saved_opportunity'   THEN 'saved'
      WHEN 'user_applied_opportunity' THEN 'applied'
    END;
  ELSIF v_evt LIKE 'application_%' THEN
    v_category := NEW.payload->>'opportunity_type';
    v_opp_id   := NEW.payload->>'opportunity_id';
    v_app_id   := NULLIF(NEW.payload->>'application_id','')::uuid;
    v_new_state := CASE v_evt
      WHEN 'application_submitted'   THEN 'applied'
      WHEN 'application_reviewing'   THEN 'reviewing'
      WHEN 'application_shortlisted' THEN 'shortlisted'
      WHEN 'application_accepted'    THEN 'accepted'
      WHEN 'application_completed'   THEN 'completed'
      WHEN 'application_rejected'    THEN 'rejected'
      WHEN 'application_withdrawn'   THEN 'withdrawn'
      ELSE NULL
    END;
  ELSE
    RETURN NEW;
  END IF;

  IF v_category IS NULL OR v_opp_id IS NULL OR v_new_state IS NULL OR v_user IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_rank := public.opportunity_lifecycle_rank(v_new_state);

  INSERT INTO public.opportunity_lifecycle_graph AS olg (
    user_id, category, opportunity_id, state, state_rank, application_id,
    first_viewed_at, last_viewed_at, view_count,
    saved_at, applied_at, reviewing_at, shortlisted_at,
    accepted_at, completed_at, rejected_at, withdrawn_at,
    last_event_id, last_event_type, last_event_at, updated_at
  ) VALUES (
    v_user, v_category, v_opp_id, v_new_state, v_new_rank, v_app_id,
    CASE WHEN v_new_state = 'viewed' THEN v_ts END,
    CASE WHEN v_new_state = 'viewed' THEN v_ts END,
    CASE WHEN v_new_state = 'viewed' THEN 1 ELSE 0 END,
    CASE WHEN v_new_state = 'saved'       THEN v_ts END,
    CASE WHEN v_new_state = 'applied'     THEN v_ts END,
    CASE WHEN v_new_state = 'reviewing'   THEN v_ts END,
    CASE WHEN v_new_state = 'shortlisted' THEN v_ts END,
    CASE WHEN v_new_state = 'accepted'    THEN v_ts END,
    CASE WHEN v_new_state = 'completed'   THEN v_ts END,
    CASE WHEN v_new_state = 'rejected'    THEN v_ts END,
    CASE WHEN v_new_state = 'withdrawn'   THEN v_ts END,
    NEW.id, v_evt, v_ts, now()
  )
  ON CONFLICT (user_id, category, opportunity_id) DO UPDATE SET
    -- Promote state only if new rank ≥ current rank (preserve forward progress)
    state      = CASE WHEN v_new_rank >= olg.state_rank THEN EXCLUDED.state ELSE olg.state END,
    state_rank = CASE WHEN v_new_rank >= olg.state_rank THEN EXCLUDED.state_rank ELSE olg.state_rank END,
    application_id  = COALESCE(EXCLUDED.application_id, olg.application_id),
    first_viewed_at = COALESCE(olg.first_viewed_at, EXCLUDED.first_viewed_at),
    last_viewed_at  = CASE WHEN v_new_state = 'viewed' THEN v_ts ELSE olg.last_viewed_at END,
    view_count      = olg.view_count + CASE WHEN v_new_state = 'viewed' THEN 1 ELSE 0 END,
    saved_at        = COALESCE(olg.saved_at,        EXCLUDED.saved_at),
    applied_at      = COALESCE(olg.applied_at,      EXCLUDED.applied_at),
    reviewing_at    = COALESCE(olg.reviewing_at,    EXCLUDED.reviewing_at),
    shortlisted_at  = COALESCE(olg.shortlisted_at,  EXCLUDED.shortlisted_at),
    accepted_at     = COALESCE(olg.accepted_at,     EXCLUDED.accepted_at),
    completed_at    = COALESCE(olg.completed_at,    EXCLUDED.completed_at),
    rejected_at     = COALESCE(olg.rejected_at,     EXCLUDED.rejected_at),
    withdrawn_at    = COALESCE(olg.withdrawn_at,    EXCLUDED.withdrawn_at),
    last_event_id   = EXCLUDED.last_event_id,
    last_event_type = EXCLUDED.last_event_type,
    last_event_at   = v_ts,
    updated_at      = now();

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS graph_events_project_lifecycle ON public.graph_events;
CREATE TRIGGER graph_events_project_lifecycle
AFTER INSERT ON public.graph_events
FOR EACH ROW EXECUTE FUNCTION public.project_opportunity_lifecycle();
