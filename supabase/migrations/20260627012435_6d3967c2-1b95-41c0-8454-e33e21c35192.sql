-- COMMITMENTS
CREATE TABLE public.commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES public.advisor_relationships(id) ON DELETE SET NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_days INT NOT NULL DEFAULT 14 CHECK (duration_days BETWEEN 1 AND 365),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_from TEXT NOT NULL DEFAULT 'self'
    CHECK (created_from IN ('activation','advisor','milestone','negotiation','ritual','self')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO authenticated;
GRANT ALL ON public.commitments TO service_role;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their commitments" ON public.commitments FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Relationship partners view linked commitments" ON public.commitments FOR SELECT TO authenticated
USING (relationship_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.advisor_relationships r WHERE r.id = commitments.relationship_id
    AND (r.advisor_id = auth.uid() OR r.user_id = auth.uid())
));
CREATE INDEX idx_commitments_owner_status ON public.commitments(owner_id, status);
CREATE INDEX idx_commitments_relationship ON public.commitments(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX idx_commitments_due ON public.commitments(due_at) WHERE status = 'active';
CREATE TRIGGER trg_commitments_updated_at BEFORE UPDATE ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tg_emit_commitment_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.graph_event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN v_event := 'commitment.created';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event := CASE NEW.status
      WHEN 'active' THEN 'commitment.started'::public.graph_event_type
      WHEN 'completed' THEN 'commitment.completed'::public.graph_event_type
      WHEN 'failed' THEN 'commitment.failed'::public.graph_event_type
      WHEN 'cancelled' THEN 'commitment.cancelled'::public.graph_event_type
      ELSE NULL END;
  END IF;
  IF v_event IS NOT NULL THEN
    INSERT INTO public.graph_events (event_type, user_id, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
    VALUES (v_event, NEW.owner_id, 'commitment', NEW.id::text, 'commitments',
      jsonb_build_object('title', NEW.title, 'relationship_id', NEW.relationship_id, 'box_id', NEW.box_id, 'created_from', NEW.created_from),
      v_event::text || ':' || NEW.id::text || ':' || COALESCE(NEW.updated_at, NEW.created_at)::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_emit_commitment_event AFTER INSERT OR UPDATE OF status ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_commitment_event();

-- RITUAL TEMPLATES & INSTANCES
CREATE TABLE public.ritual_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','one_off','on_demand')),
  default_duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ritual_templates TO authenticated, anon;
GRANT ALL ON public.ritual_templates TO service_role;
ALTER TABLE public.ritual_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ritual templates public read" ON public.ritual_templates
FOR SELECT TO authenticated, anon USING (is_active = true);
CREATE TRIGGER trg_ritual_templates_updated_at BEFORE UPDATE ON public.ritual_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ritual_templates (slug, name, description, cadence) VALUES
  ('weekly_standup','Weekly Standup','Short status sync between collaborators.','weekly'),
  ('solution_pitch','Solution Pitch','Pitch your validated solution to advisors.','one_off'),
  ('demo_day','Demo Day','Public demo of progress to the ecosystem.','monthly'),
  ('office_hours','Office Hours','Advisor open hours for any collaborator.','weekly'),
  ('peer_review','Peer Review','Founder-to-founder review of evidence and progress.','biweekly');

CREATE TABLE public.ritual_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.ritual_templates(id) ON DELETE RESTRICT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  relationship_id UUID REFERENCES public.advisor_relationships(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show')),
  participants UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_instances TO authenticated;
GRANT ALL ON public.ritual_instances TO service_role;
ALTER TABLE public.ritual_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage their ritual instances" ON public.ritual_instances FOR ALL TO authenticated
USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Participants view ritual instances" ON public.ritual_instances FOR SELECT TO authenticated
USING (auth.uid() = ANY(participants) OR auth.uid() = host_id);
CREATE INDEX idx_ritual_instances_host ON public.ritual_instances(host_id);
CREATE INDEX idx_ritual_instances_box ON public.ritual_instances(box_id) WHERE box_id IS NOT NULL;
CREATE INDEX idx_ritual_instances_scheduled ON public.ritual_instances(scheduled_at) WHERE status IN ('scheduled','in_progress');
CREATE TRIGGER trg_ritual_instances_updated_at BEFORE UPDATE ON public.ritual_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MILESTONES
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  kind TEXT NOT NULL,
  achieved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, kind)
);
GRANT SELECT, INSERT ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Milestones visible to authenticated" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner of subject inserts milestone" ON public.milestones FOR INSERT TO authenticated
WITH CHECK (achieved_by = auth.uid() OR (entity_type = 'person' AND entity_id = auth.uid()));
CREATE INDEX idx_milestones_entity ON public.milestones(entity_type, entity_id);
CREATE INDEX idx_milestones_kind ON public.milestones(kind);

CREATE OR REPLACE FUNCTION public.tg_emit_milestone_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.graph_events (event_type, user_id, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES ('milestone.achieved'::public.graph_event_type, NEW.achieved_by, NEW.entity_type, NEW.entity_id::text, 'milestones',
    jsonb_build_object('milestone_id', NEW.id, 'kind', NEW.kind),
    'milestone.achieved:' || NEW.id::text)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_emit_milestone_event AFTER INSERT ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_milestone_event();

-- CONTRIBUTIONS
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  kind TEXT NOT NULL,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  relationship_id UUID REFERENCES public.advisor_relationships(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contributions visible to authenticated" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Actors record their contributions" ON public.contributions FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());
CREATE INDEX idx_contributions_actor ON public.contributions(actor_id);
CREATE INDEX idx_contributions_entity ON public.contributions(entity_type, entity_id);
CREATE INDEX idx_contributions_kind ON public.contributions(kind);

CREATE OR REPLACE FUNCTION public.tg_emit_contribution_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.graph_events (event_type, user_id, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES ('contribution.recorded'::public.graph_event_type, NEW.actor_id, NEW.entity_type, NEW.entity_id::text, 'contributions',
    jsonb_build_object('contribution_id', NEW.id, 'kind', NEW.kind, 'weight', NEW.weight),
    'contribution.recorded:' || NEW.id::text)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_emit_contribution_event AFTER INSERT ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_contribution_event();

INSERT INTO public.event_catalog (event_type, event_version, source_module, description) VALUES
  ('commitment.created',1,'commitments','A commitment was created.'),
  ('commitment.started',1,'commitments','A commitment moved to active.'),
  ('commitment.progressed',1,'commitments','Progress was logged on a commitment.'),
  ('commitment.completed',1,'commitments','A commitment was completed.'),
  ('commitment.failed',1,'commitments','A commitment expired without completion.'),
  ('commitment.cancelled',1,'commitments','A commitment was cancelled.'),
  ('milestone.achieved',1,'milestones','An entity reached a milestone.'),
  ('contribution.recorded',1,'contributions','A contribution of value was recorded.'),
  ('ritual.instance.scheduled',1,'rituals','A ritual instance was scheduled.'),
  ('ritual.instance.completed',1,'rituals','A ritual instance was completed.'),
  ('relationship.formed',1,'relationships','An advisor relationship was formed.')
ON CONFLICT (event_type, event_version) DO NOTHING;

-- Upgraded relationship_health projection
CREATE OR REPLACE FUNCTION public.refresh_relationship_health(_rel_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rel RECORD;
  v_interaction_count INT; v_last TIMESTAMPTZ; v_days INT;
  v_commitments_completed INT; v_open_commitments INT; v_milestones INT;
  v_continuity_days INT; v_response_consistency NUMERIC; v_score NUMERIC;
BEGIN
  SELECT * INTO v_rel FROM public.advisor_relationships WHERE id = _rel_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COUNT(*), MAX(created_at) INTO v_interaction_count, v_last
  FROM public.chat_messages cm WHERE cm.sender_id IN (v_rel.advisor_id, v_rel.user_id);
  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status IN ('pending','active'))
  INTO v_commitments_completed, v_open_commitments
  FROM public.commitments WHERE relationship_id = _rel_id;
  SELECT COUNT(*) INTO v_milestones FROM public.milestones m
  WHERE (m.entity_type = 'person' AND m.entity_id IN (v_rel.advisor_id, v_rel.user_id))
     OR (m.metadata ->> 'relationship_id' = _rel_id::text);
  v_continuity_days := EXTRACT(DAY FROM (now() - v_rel.started_at))::INT;
  v_days := CASE WHEN v_last IS NULL THEN NULL ELSE EXTRACT(DAY FROM (now() - v_last))::INT END;
  v_response_consistency := CASE WHEN (v_commitments_completed + v_open_commitments) = 0 THEN 0
    ELSE v_commitments_completed::NUMERIC / (v_commitments_completed + v_open_commitments) END;
  v_score := LEAST(100, v_commitments_completed * 15 + v_milestones * 10
    + v_response_consistency * 20 + LEAST(v_continuity_days / 7.0, 10) * 2
    + GREATEST(0, 20 - COALESCE(v_days, 30) * 0.5));
  INSERT INTO public.relationship_health (
    relationship_id, days_since_last_interaction, interaction_count,
    milestones_completed, open_commitments, health_score, last_interaction_at, computed_at
  ) VALUES (_rel_id, v_days, COALESCE(v_interaction_count, 0),
    v_milestones, v_open_commitments, v_score, v_last, now())
  ON CONFLICT (relationship_id) DO UPDATE
  SET days_since_last_interaction = EXCLUDED.days_since_last_interaction,
      interaction_count = EXCLUDED.interaction_count,
      milestones_completed = EXCLUDED.milestones_completed,
      open_commitments = EXCLUDED.open_commitments,
      health_score = EXCLUDED.health_score,
      last_interaction_at = EXCLUDED.last_interaction_at,
      computed_at = now();
END; $$;
REVOKE EXECUTE ON FUNCTION public.refresh_relationship_health(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_relationship_health(UUID) TO authenticated, service_role;

-- Relationship timeline
CREATE OR REPLACE FUNCTION public.get_relationship_timeline(_rel_id UUID)
RETURNS TABLE (occurred_at TIMESTAMPTZ, event_type TEXT, user_id UUID, aggregate_type TEXT, aggregate_id TEXT, payload JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rel RECORD;
BEGIN
  SELECT * INTO v_rel FROM public.advisor_relationships WHERE id = _rel_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF auth.uid() <> v_rel.advisor_id AND auth.uid() <> v_rel.user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT v_rel.started_at, 'relationship.formed'::TEXT, v_rel.advisor_id, 'relationship'::TEXT, v_rel.id::TEXT,
         jsonb_build_object('type', v_rel.relationship_type)
  UNION ALL
  SELECT ge.occurred_at, ge.event_type::TEXT, ge.user_id, ge.aggregate_type, ge.aggregate_id, ge.payload
  FROM public.graph_events ge
  WHERE ge.aggregate_type = 'commitment'
    AND ge.aggregate_id IN (SELECT id::text FROM public.commitments WHERE relationship_id = _rel_id)
  UNION ALL
  SELECT ge.occurred_at, ge.event_type::TEXT, ge.user_id, ge.aggregate_type, ge.aggregate_id, ge.payload
  FROM public.graph_events ge
  WHERE ge.event_type = 'milestone.achieved'
    AND ge.payload ->> 'relationship_id' = _rel_id::text
  UNION ALL
  SELECT ge.occurred_at, ge.event_type::TEXT, ge.user_id, ge.aggregate_type, ge.aggregate_id, ge.payload
  FROM public.graph_events ge
  WHERE ge.event_type = 'contribution.recorded'
    AND ge.aggregate_id IN (SELECT entity_id::text FROM public.contributions WHERE relationship_id = _rel_id)
  ORDER BY 1 ASC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_relationship_timeline(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_relationship_timeline(UUID) TO authenticated, service_role;

-- Box feed
CREATE OR REPLACE FUNCTION public.get_box_feed(_box_id UUID, _limit INT DEFAULT 50)
RETURNS TABLE (occurred_at TIMESTAMPTZ, event_type TEXT, user_id UUID, aggregate_type TEXT, aggregate_id TEXT, payload JSONB)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ge.occurred_at, ge.event_type::TEXT, ge.user_id, ge.aggregate_type, ge.aggregate_id, ge.payload
  FROM public.graph_events ge
  WHERE ge.event_type IN (
    'idea.solution.validated','relationship.formed','commitment.completed',
    'milestone.achieved','contribution.recorded','ritual.instance.completed',
    'startup.team.joined','company.incorporated'
  )
  AND (_box_id IS NULL OR (ge.payload ->> 'box_id')::uuid = _box_id)
  ORDER BY ge.occurred_at DESC
  LIMIT _limit;
$$;
REVOKE EXECUTE ON FUNCTION public.get_box_feed(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_box_feed(UUID, INT) TO authenticated, anon, service_role;