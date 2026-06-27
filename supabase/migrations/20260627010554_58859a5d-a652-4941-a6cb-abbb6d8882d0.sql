
-- ============================================================
-- Part A: Sprint 1 hardening
-- ============================================================

-- A1. Separate approval from evidence on startup_ideas
ALTER TABLE public.startup_ideas
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_evidence_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by UUID,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Fix gate trigger column name bug (was startup_idea_id, real col is startup_id)
CREATE OR REPLACE FUNCTION public.tg_gate_application_by_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_stage TEXT;
  v_created TIMESTAMPTZ;
  v_extended TIMESTAMPTZ;
BEGIN
  SELECT solution_stage, created_at, solution_extended_until
    INTO v_stage, v_created, v_extended
    FROM public.startup_ideas WHERE id = NEW.startup_id;

  IF v_stage IS NULL THEN RETURN NEW; END IF;

  IF v_stage = 'draft' THEN
    RAISE EXCEPTION 'This idea is still in draft. Complete the Solution Canvas before accepting applications.';
  END IF;

  IF v_stage = 'discovery'
     AND v_created < now() - INTERVAL '7 days'
     AND (v_extended IS NULL OR v_extended < now())
  THEN
    RAISE EXCEPTION 'This idea must be validated by an advisor or admin before new applications.';
  END IF;

  RETURN NEW;
END $$;

-- A2. New enum values for canonical event types
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_solution_canvas_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_discovery_entered';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_validation_approved';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_validation_extended';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_validation_revoked';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'idea_evidence_added';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'advisor_eligibility_changed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'advisor_approved';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'advisor_paused';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'advisor_removed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'box_request_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'box_request_accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'box_request_matched';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'box_request_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'box_request_archived';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'admin_override_recorded';

-- A4. Generalized evidence table
CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,   -- 'idea','person','startup','negotiation','advisor','company'
  entity_id UUID NOT NULL,
  kind TEXT NOT NULL,           -- 'problem_interview','signup','loi','testimonial','reference', ...
  summary TEXT,
  url TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_by UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON public.evidence(entity_type, entity_id);

CREATE POLICY "Anyone authed reads evidence"
  ON public.evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Capturer inserts evidence"
  ON public.evidence FOR INSERT TO authenticated WITH CHECK (captured_by = auth.uid());
CREATE POLICY "Capturer or admin edits"
  ON public.evidence FOR UPDATE TO authenticated
  USING (captured_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Capturer or admin deletes"
  ON public.evidence FOR DELETE TO authenticated
  USING (captured_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Trigger: keep startup_ideas.evidence_count + last_evidence_at in sync for entity_type='idea'
CREATE OR REPLACE FUNCTION public.tg_evidence_sync_idea()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.entity_type = 'idea' THEN
    UPDATE public.startup_ideas
      SET evidence_count = evidence_count + 1,
          last_evidence_at = GREATEST(COALESCE(last_evidence_at, NEW.captured_at), NEW.captured_at)
    WHERE id = NEW.entity_id;
  ELSIF TG_OP = 'DELETE' AND OLD.entity_type = 'idea' THEN
    UPDATE public.startup_ideas
      SET evidence_count = GREATEST(0, evidence_count - 1)
    WHERE id = OLD.entity_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_evidence_sync_idea ON public.evidence;
CREATE TRIGGER trg_evidence_sync_idea
  AFTER INSERT OR DELETE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.tg_evidence_sync_idea();

-- A2b. Rewrite ladder progression to emit events + preserve timestamps (append-only)
CREATE OR REPLACE FUNCTION public.tg_sync_solution_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_old_stage TEXT;
  v_new_stage TEXT := 'draft';
  v_creator UUID;
BEGIN
  SELECT solution_stage, creator_id INTO v_old_stage, v_creator
    FROM public.startup_ideas WHERE id = NEW.idea_id;

  IF NEW.signed_off_at IS NOT NULL THEN
    v_new_stage := 'validated';
  ELSIF NEW.completed_at IS NOT NULL THEN
    v_new_stage := 'discovery';
  ELSE
    v_new_stage := 'draft';
  END IF;

  -- Project current stage; preserve validated_by/validated_at as historical fact
  UPDATE public.startup_ideas
    SET solution_stage = v_new_stage,
        ladder_solution_at = CASE
          WHEN v_new_stage = 'validated' AND ladder_solution_at IS NULL THEN now()
          ELSE ladder_solution_at END,
        validated_by = CASE
          WHEN v_new_stage = 'validated' AND validated_by IS NULL THEN NEW.signed_off_by
          ELSE validated_by END,
        validated_at = CASE
          WHEN v_new_stage = 'validated' AND validated_at IS NULL THEN NEW.signed_off_at
          ELSE validated_at END
    WHERE id = NEW.idea_id;

  -- Emit append-only events on transitions
  IF v_old_stage IS DISTINCT FROM v_new_stage THEN
    IF v_new_stage = 'discovery' THEN
      INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
      VALUES (v_creator, 'idea_solution_canvas_completed', 'idea', NEW.idea_id::text, 'solution_canvas',
              jsonb_build_object('canonical_name','idea.solution_canvas.completed','idea_id',NEW.idea_id),
              'idea:'||NEW.idea_id||':canvas_completed')
      ON CONFLICT (idempotency_key) DO NOTHING;

      INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
      VALUES (v_creator, 'idea_discovery_entered', 'idea', NEW.idea_id::text, 'solution_canvas',
              jsonb_build_object('canonical_name','idea.discovery.entered','idea_id',NEW.idea_id),
              'idea:'||NEW.idea_id||':discovery_entered')
      ON CONFLICT (idempotency_key) DO NOTHING;
    ELSIF v_new_stage = 'validated' THEN
      INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
      VALUES (COALESCE(NEW.signed_off_by, v_creator), 'idea_validation_approved', 'idea', NEW.idea_id::text, 'solution_canvas',
              jsonb_build_object('canonical_name','idea.validation.approved','idea_id',NEW.idea_id,'approver',NEW.signed_off_by,'role',NEW.signed_off_role),
              'idea:'||NEW.idea_id||':validated:'||extract(epoch from NEW.signed_off_at)::text)
      ON CONFLICT (idempotency_key) DO NOTHING;
    ELSIF v_old_stage = 'validated' AND v_new_stage <> 'validated' THEN
      INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
      VALUES (v_creator, 'idea_validation_revoked', 'idea', NEW.idea_id::text, 'solution_canvas',
              jsonb_build_object('canonical_name','idea.validation.revoked','idea_id',NEW.idea_id),
              'idea:'||NEW.idea_id||':revoked:'||extract(epoch from now())::text)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- ============================================================
-- Part B: Sprint 2 — Box advisor layer
-- ============================================================

-- B0. Boxes (ecosystems)
CREATE TABLE IF NOT EXISTS public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.boxes TO authenticated, anon;
GRANT ALL ON public.boxes TO service_role;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads boxes" ON public.boxes FOR SELECT USING (true);
CREATE POLICY "Admins manage boxes" ON public.boxes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed a few boxes
INSERT INTO public.boxes(slug,name,domain,description) VALUES
  ('box4health','Box 4 Health Solutions','health','Solutions across health, wellness, and medical access.'),
  ('box4education','Box 4 Education Solutions','education','Solutions across learning, training, and access to knowledge.'),
  ('box4security','Box 4 Security Solutions','security','Solutions across cyber, physical, and information security.'),
  ('box4finance','Box 4 Financial Solutions','finance','Solutions across personal finance, access to capital, and fintech.')
ON CONFLICT (slug) DO NOTHING;

-- B1. box_advisors (capacity only — load is derived)
CREATE TABLE IF NOT EXISTS public.box_advisors (
  user_id UUID NOT NULL,
  box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|paused|removed (projection from events)
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  capacity INTEGER NOT NULL DEFAULT 5,
  accepting_requests BOOLEAN NOT NULL DEFAULT true,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, box_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.box_advisors TO authenticated;
GRANT ALL ON public.box_advisors TO service_role;
ALTER TABLE public.box_advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed read active advisors" ON public.box_advisors FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Advisor can pause self" ON public.box_advisors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage advisors" ON public.box_advisors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- B2. advisor_readiness — ELIGIBILITY ONLY (no suitability fields)
CREATE TABLE IF NOT EXISTS public.advisor_readiness (
  user_id UUID PRIMARY KEY,
  eligible BOOLEAN NOT NULL DEFAULT false,
  nr_complete BOOLEAN NOT NULL DEFAULT false,
  verified_skills INTEGER NOT NULL DEFAULT 0,
  track_record_count INTEGER NOT NULL DEFAULT 0,
  reputation_score NUMERIC NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  eligibility_reason TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advisor_readiness TO authenticated;
GRANT ALL ON public.advisor_readiness TO service_role;
ALTER TABLE public.advisor_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed read readiness" ON public.advisor_readiness FOR SELECT TO authenticated USING (true);

-- B2b. advisor_metrics — suitability projection
CREATE TABLE IF NOT EXISTS public.advisor_metrics (
  advisor_id UUID PRIMARY KEY,
  requests_received INTEGER NOT NULL DEFAULT 0,
  requests_completed INTEGER NOT NULL DEFAULT 0,
  median_response_seconds INTEGER,
  approval_rate NUMERIC,             -- approvals / sign-off requests
  average_feedback NUMERIC,
  last_request_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advisor_metrics TO authenticated;
GRANT ALL ON public.advisor_metrics TO service_role;
ALTER TABLE public.advisor_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed read metrics" ON public.advisor_metrics FOR SELECT TO authenticated USING (true);

-- B3. box_inbound_requests — status is a projection from graph_events
CREATE TABLE IF NOT EXISTS public.box_inbound_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'mentorship', -- solution_signoff|mentorship|dispute|partnership|hiring|fundraising|technical_review
  topic TEXT NOT NULL,
  context TEXT,
  subject_entity_type TEXT,   -- e.g. 'idea'
  subject_entity_id UUID,     -- e.g. startup_ideas.id for solution_signoff
  status TEXT NOT NULL DEFAULT 'requested', -- requested|accepted|matched|completed|archived (projection)
  assigned_advisor_id UUID,
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.box_inbound_requests TO authenticated;
GRANT ALL ON public.box_inbound_requests TO service_role;
ALTER TABLE public.box_inbound_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bir_advisor_status ON public.box_inbound_requests(assigned_advisor_id, status);
CREATE INDEX IF NOT EXISTS idx_bir_requester ON public.box_inbound_requests(requester_id);

CREATE POLICY "Requester reads own" ON public.box_inbound_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR assigned_advisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Requester creates" ON public.box_inbound_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Advisor or admin updates" ON public.box_inbound_requests FOR UPDATE TO authenticated
  USING (assigned_advisor_id = auth.uid() OR requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- B5. admin_overrides — append-only audit
CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  target_kind TEXT NOT NULL, -- 'user','idea','request','advisor'
  target_id UUID NOT NULL,
  overridden_rule TEXT NOT NULL,
  reason TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_overrides TO authenticated;
GRANT ALL ON public.admin_overrides TO service_role;
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read overrides" ON public.admin_overrides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert overrides" ON public.admin_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND actor_id = auth.uid());

-- ============================================================
-- Functions
-- ============================================================

-- recompute_advisor_readiness: pulls from source-of-truth tables, writes projection, emits event on change.
CREATE OR REPLACE FUNCTION public.recompute_advisor_readiness(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nr_complete BOOLEAN := false;
  v_verified_skills INT := 0;
  v_track_record INT := 0;
  v_reputation NUMERIC := 0;
  v_last_activity TIMESTAMPTZ;
  v_eligible BOOLEAN;
  v_reason TEXT;
  v_prev_eligible BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.natural_roles WHERE user_id = _user_id) INTO v_nr_complete;

  SELECT COUNT(*) INTO v_verified_skills
    FROM public.user_skills WHERE user_id = _user_id;

  SELECT COUNT(*) INTO v_track_record
    FROM public.startup_team_members WHERE user_id = _user_id;

  SELECT COALESCE(SUM(score),0) INTO v_reputation
    FROM public.reputation_graph WHERE user_id = _user_id;

  SELECT MAX(occurred_at) INTO v_last_activity
    FROM public.graph_events WHERE user_id = _user_id;

  IF NOT v_nr_complete THEN v_reason := 'Natural Role assessment incomplete';
  ELSIF v_verified_skills < 3 THEN v_reason := 'Needs at least 3 verified skills (has '||v_verified_skills||')';
  ELSIF v_track_record < 1 THEN v_reason := 'Needs at least 1 track-record entry';
  ELSE v_reason := 'Eligible';
  END IF;

  v_eligible := v_nr_complete AND v_verified_skills >= 3 AND v_track_record >= 1;

  SELECT eligible INTO v_prev_eligible FROM public.advisor_readiness WHERE user_id = _user_id;

  INSERT INTO public.advisor_readiness(
    user_id, eligible, nr_complete, verified_skills, track_record_count,
    reputation_score, last_activity_at, eligibility_reason, computed_at)
  VALUES (_user_id, v_eligible, v_nr_complete, v_verified_skills, v_track_record,
          v_reputation, v_last_activity, v_reason, now())
  ON CONFLICT (user_id) DO UPDATE SET
    eligible = EXCLUDED.eligible,
    nr_complete = EXCLUDED.nr_complete,
    verified_skills = EXCLUDED.verified_skills,
    track_record_count = EXCLUDED.track_record_count,
    reputation_score = EXCLUDED.reputation_score,
    last_activity_at = EXCLUDED.last_activity_at,
    eligibility_reason = EXCLUDED.eligibility_reason,
    computed_at = now();

  IF v_prev_eligible IS DISTINCT FROM v_eligible THEN
    INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
    VALUES (_user_id, 'advisor_eligibility_changed', 'user', _user_id::text, 'advisor_readiness',
            jsonb_build_object('canonical_name','advisor.eligibility.changed','eligible',v_eligible,'reason',v_reason),
            'advisor:'||_user_id||':elig:'||extract(epoch from now())::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
END $$;

-- Triggers to recompute readiness on source-of-truth changes
CREATE OR REPLACE FUNCTION public.tg_recompute_readiness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_advisor_readiness(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_readiness_nr ON public.natural_roles;
CREATE TRIGGER trg_readiness_nr AFTER INSERT OR DELETE ON public.natural_roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_readiness();

DROP TRIGGER IF EXISTS trg_readiness_skills ON public.user_skills;
CREATE TRIGGER trg_readiness_skills AFTER INSERT OR DELETE ON public.user_skills
  FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_readiness();

DROP TRIGGER IF EXISTS trg_readiness_team ON public.startup_team_members;
CREATE TRIGGER trg_readiness_team AFTER INSERT OR DELETE ON public.startup_team_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_readiness();

-- recompute_advisor_metrics: aggregates from box_inbound_requests
CREATE OR REPLACE FUNCTION public.recompute_advisor_metrics(_advisor_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_received INT := 0;
  v_completed INT := 0;
  v_median_resp INT;
  v_last_req TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_received FROM public.box_inbound_requests WHERE assigned_advisor_id = _advisor_id;
  SELECT COUNT(*) INTO v_completed FROM public.box_inbound_requests WHERE assigned_advisor_id = _advisor_id AND status='completed';
  SELECT MAX(assigned_at) INTO v_last_req FROM public.box_inbound_requests WHERE assigned_advisor_id = _advisor_id;

  SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (accepted_at - assigned_at))))::INT
    INTO v_median_resp
    FROM public.box_inbound_requests
    WHERE assigned_advisor_id = _advisor_id AND accepted_at IS NOT NULL AND assigned_at IS NOT NULL;

  INSERT INTO public.advisor_metrics(advisor_id, requests_received, requests_completed, median_response_seconds, last_request_at, computed_at)
  VALUES (_advisor_id, v_received, v_completed, v_median_resp, v_last_req, now())
  ON CONFLICT (advisor_id) DO UPDATE SET
    requests_received = EXCLUDED.requests_received,
    requests_completed = EXCLUDED.requests_completed,
    median_response_seconds = EXCLUDED.median_response_seconds,
    last_request_at = EXCLUDED.last_request_at,
    computed_at = now();
END $$;

-- match_advisors_for_request — returns RANKED candidates (does not auto-assign)
CREATE OR REPLACE FUNCTION public.match_advisors_for_request(_request_id UUID, _limit INT DEFAULT 5)
RETURNS TABLE (
  advisor_id UUID,
  box_id UUID,
  match_score NUMERIC,
  current_load INT,
  capacity INT,
  reputation_score NUMERIC,
  median_response_seconds INT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_box UUID;
  v_type TEXT;
BEGIN
  SELECT box_id, request_type INTO v_box, v_type
    FROM public.box_inbound_requests WHERE id = _request_id;

  RETURN QUERY
  WITH loads AS (
    SELECT assigned_advisor_id AS uid, COUNT(*)::INT AS load
      FROM public.box_inbound_requests
      WHERE status IN ('matched','accepted') AND assigned_advisor_id IS NOT NULL
      GROUP BY assigned_advisor_id
  )
  SELECT
    ba.user_id,
    ba.box_id,
    -- match_score: domain overlap (40) + capacity headroom (20) + reputation (20) + response speed (20)
    (
      CASE WHEN ba.box_id = v_box THEN 40 ELSE 10 END
      + LEAST(20, GREATEST(0, (ba.capacity - COALESCE(l.load,0))) * 4)
      + LEAST(20, COALESCE(ar.reputation_score,0))
      + CASE
          WHEN am.median_response_seconds IS NULL THEN 10
          WHEN am.median_response_seconds < 3600 THEN 20
          WHEN am.median_response_seconds < 86400 THEN 15
          ELSE 5 END
    )::NUMERIC AS match_score,
    COALESCE(l.load,0)::INT,
    ba.capacity,
    COALESCE(ar.reputation_score,0),
    am.median_response_seconds
  FROM public.box_advisors ba
  JOIN public.advisor_readiness ar ON ar.user_id = ba.user_id
  LEFT JOIN public.advisor_metrics am ON am.advisor_id = ba.user_id
  LEFT JOIN loads l ON l.uid = ba.user_id
  WHERE ba.status = 'active'
    AND ba.accepting_requests = true
    AND ar.eligible = true
    AND COALESCE(l.load,0) < ba.capacity
  ORDER BY match_score DESC
  LIMIT _limit;
END $$;

-- request_transition: append-only state machine via events
CREATE OR REPLACE FUNCTION public.transition_box_request(
  _request_id UUID,
  _new_status TEXT,
  _advisor UUID DEFAULT NULL,
  _meta JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_req public.box_inbound_requests%ROWTYPE;
  v_event public.graph_event_type;
  v_canonical TEXT;
BEGIN
  SELECT * INTO v_req FROM public.box_inbound_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  v_event := CASE _new_status
    WHEN 'matched'   THEN 'box_request_matched'::public.graph_event_type
    WHEN 'accepted'  THEN 'box_request_accepted'::public.graph_event_type
    WHEN 'completed' THEN 'box_request_completed'::public.graph_event_type
    WHEN 'archived'  THEN 'box_request_archived'::public.graph_event_type
    ELSE NULL END;

  IF v_event IS NULL THEN RAISE EXCEPTION 'Invalid status %', _new_status; END IF;

  v_canonical := 'box.request.'||_new_status;

  -- Update projection
  UPDATE public.box_inbound_requests SET
    status = _new_status,
    assigned_advisor_id = COALESCE(_advisor, assigned_advisor_id),
    assigned_at  = CASE WHEN _new_status='matched'   AND assigned_at  IS NULL THEN now() ELSE assigned_at  END,
    accepted_at  = CASE WHEN _new_status='accepted'  AND accepted_at  IS NULL THEN now() ELSE accepted_at  END,
    completed_at = CASE WHEN _new_status='completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
    archived_at  = CASE WHEN _new_status='archived'  AND archived_at  IS NULL THEN now() ELSE archived_at  END,
    updated_at = now()
  WHERE id = _request_id;

  -- Append event
  INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES (v_actor, v_event, 'box_request', _request_id::text, 'box_advisors',
          jsonb_build_object('canonical_name',v_canonical,'request_id',_request_id,'advisor',COALESCE(_advisor,v_req.assigned_advisor_id),'meta',_meta),
          'bir:'||_request_id||':'||_new_status||':'||extract(epoch from now())::text)
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- Recompute metrics for advisor
  IF COALESCE(_advisor, v_req.assigned_advisor_id) IS NOT NULL THEN
    PERFORM public.recompute_advisor_metrics(COALESCE(_advisor, v_req.assigned_advisor_id));
  END IF;
END $$;

-- Emit creation event when a request is inserted
CREATE OR REPLACE FUNCTION public.tg_box_request_created()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES (NEW.requester_id, 'box_request_created', 'box_request', NEW.id::text, 'box_advisors',
          jsonb_build_object('canonical_name','box.request.created','request_id',NEW.id,'box_id',NEW.box_id,'type',NEW.request_type),
          'bir:'||NEW.id||':created')
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_box_request_created ON public.box_inbound_requests;
CREATE TRIGGER trg_box_request_created AFTER INSERT ON public.box_inbound_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_box_request_created();

-- updated_at touchers
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_box_advisors ON public.box_advisors;
CREATE TRIGGER trg_touch_box_advisors BEFORE UPDATE ON public.box_advisors
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_boxes ON public.boxes;
CREATE TRIGGER trg_touch_boxes BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
DROP TRIGGER IF EXISTS trg_touch_bir ON public.box_inbound_requests;
CREATE TRIGGER trg_touch_bir BEFORE UPDATE ON public.box_inbound_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
