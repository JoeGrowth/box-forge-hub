-- Relationship entity (persistent, outlives requests)
CREATE TABLE public.advisor_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  origin_request_id UUID REFERENCES public.box_inbound_requests(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('mentor','reviewer','coach','domain_expert','investor_contact')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (advisor_id, user_id, relationship_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_relationships TO authenticated;
GRANT ALL ON public.advisor_relationships TO service_role;
ALTER TABLE public.advisor_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their relationships"
ON public.advisor_relationships FOR SELECT TO authenticated
USING (auth.uid() = advisor_id OR auth.uid() = user_id);

CREATE POLICY "Advisors and users can update their relationship status"
ON public.advisor_relationships FOR UPDATE TO authenticated
USING (auth.uid() = advisor_id OR auth.uid() = user_id);

CREATE POLICY "No direct inserts; system-managed"
ON public.advisor_relationships FOR INSERT TO authenticated
WITH CHECK (false);

CREATE INDEX idx_advisor_relationships_advisor ON public.advisor_relationships(advisor_id) WHERE status = 'active';
CREATE INDEX idx_advisor_relationships_user ON public.advisor_relationships(user_id) WHERE status = 'active';

CREATE TRIGGER trg_advisor_relationships_updated_at
BEFORE UPDATE ON public.advisor_relationships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create relationship when box_inbound_request reaches accepted/completed
CREATE OR REPLACE FUNCTION public.tg_create_relationship_from_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rel_type TEXT;
BEGIN
  IF NEW.status IN ('accepted','completed') AND NEW.assigned_advisor_id IS NOT NULL THEN
    v_rel_type := CASE NEW.request_type
      WHEN 'solution_signoff' THEN 'reviewer'
      WHEN 'mentorship' THEN 'mentor'
      WHEN 'technical_review' THEN 'reviewer'
      WHEN 'fundraising' THEN 'investor_contact'
      WHEN 'partnership' THEN 'domain_expert'
      WHEN 'hiring' THEN 'domain_expert'
      WHEN 'dispute' THEN 'coach'
      ELSE 'mentor'
    END;
    INSERT INTO public.advisor_relationships (advisor_id, user_id, box_id, origin_request_id, relationship_type)
    VALUES (NEW.assigned_advisor_id, NEW.requester_id, NEW.box_id, NEW.id, v_rel_type)
    ON CONFLICT (advisor_id, user_id, relationship_type) DO UPDATE
    SET status = 'active', ended_at = NULL, updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_create_relationship_from_request ON public.box_inbound_requests;
CREATE TRIGGER trg_create_relationship_from_request
AFTER INSERT OR UPDATE OF status ON public.box_inbound_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_create_relationship_from_request();

-- relationship_health projection
CREATE TABLE public.relationship_health (
  relationship_id UUID NOT NULL PRIMARY KEY REFERENCES public.advisor_relationships(id) ON DELETE CASCADE,
  days_since_last_interaction INT,
  interaction_count INT NOT NULL DEFAULT 0,
  milestones_completed INT NOT NULL DEFAULT 0,
  open_commitments INT NOT NULL DEFAULT 0,
  health_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.relationship_health TO authenticated;
GRANT ALL ON public.relationship_health TO service_role;
ALTER TABLE public.relationship_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view their relationship health"
ON public.relationship_health FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.advisor_relationships r
  WHERE r.id = relationship_health.relationship_id
    AND (r.advisor_id = auth.uid() OR r.user_id = auth.uid())
));

-- Public projection: only fields the public advisor strip needs
CREATE OR REPLACE FUNCTION public.list_box_advisors_public(_box_id UUID)
RETURNS TABLE (
  advisor_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  natural_role TEXT,
  verified_skills_count INT,
  track_record_count INT,
  reputation_score NUMERIC,
  response_rate NUMERIC,
  median_response_seconds INT,
  remaining_capacity INT,
  capacity INT,
  accepting_requests BOOLEAN,
  eligible BOOLEAN,
  suitability_score NUMERIC,
  status TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ba.user_id AS advisor_id,
    p.full_name AS display_name,
    p.avatar_url,
    nr.description AS natural_role,
    COALESCE(rd.verified_skills, 0) AS verified_skills_count,
    COALESCE(rd.track_record_count, 0) AS track_record_count,
    COALESCE(rg.reputation_score, 0) AS reputation_score,
    COALESCE(am.approval_rate, 0) AS response_rate,
    am.median_response_seconds,
    GREATEST(ba.capacity - COALESCE((
      SELECT COUNT(*)::INT FROM public.box_inbound_requests r
      WHERE r.assigned_advisor_id = ba.user_id
        AND r.status IN ('matched','accepted')
    ), 0), 0) AS remaining_capacity,
    ba.capacity,
    ba.accepting_requests,
    COALESCE(rd.eligible, false) AS eligible,
    -- Composite suitability: approval rate + reputation, penalized by response time
    (COALESCE(am.approval_rate, 0) * 0.5
     + LEAST(COALESCE(rg.reputation_score, 0), 100) * 0.4
     + CASE WHEN am.median_response_seconds IS NULL THEN 0
            ELSE GREATEST(0, 10 - LEAST(am.median_response_seconds, 86400) / 8640.0) END
    ) AS suitability_score,
    ba.status
  FROM public.box_advisors ba
  LEFT JOIN public.profiles p ON p.user_id = ba.user_id
  LEFT JOIN public.natural_roles nr ON nr.user_id = ba.user_id
  LEFT JOIN public.advisor_readiness rd ON rd.user_id = ba.user_id
  LEFT JOIN public.advisor_metrics am ON am.advisor_id = ba.user_id
  LEFT JOIN public.reputation_graph rg ON rg.user_id = ba.user_id
  WHERE ba.box_id = _box_id
    AND ba.status = 'active'
  ORDER BY 14 DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.list_box_advisors_public(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_box_advisors_public(UUID) TO authenticated, anon, service_role;
