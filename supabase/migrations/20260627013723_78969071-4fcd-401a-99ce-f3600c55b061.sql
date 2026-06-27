
ALTER TABLE public.advisor_relationships
  ADD COLUMN IF NOT EXISTS relationship_kind text NOT NULL DEFAULT 'advisor';
UPDATE public.advisor_relationships SET relationship_kind = 'advisor' WHERE relationship_kind IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'advisor_relationships_relationship_kind_check') THEN
    ALTER TABLE public.advisor_relationships
      ADD CONSTRAINT advisor_relationships_relationship_kind_check
      CHECK (relationship_kind = ANY (ARRAY['advisor','teammate','founder','partner','investor','collaborator']));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_advisor_relationships_kind ON public.advisor_relationships(relationship_kind);

CREATE OR REPLACE VIEW public.relationships AS
SELECT id, relationship_kind AS kind, relationship_type AS sub_type,
       advisor_id AS party_a_id, user_id AS party_b_id,
       box_id, origin_request_id, status, started_at, ended_at, metadata, created_at, updated_at
FROM public.advisor_relationships;
GRANT SELECT ON public.relationships TO authenticated;
GRANT ALL    ON public.relationships TO service_role;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type = ANY (ARRAY['co_builder','advisor','partnership','hiring','investment','consulting','collaboration'])),
  title text NOT NULL,
  description text,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_entity_type text,
  source_entity_id   uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft','open','matched','accepted','closed','expired'])),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility = ANY (ARRAY['public','box','private'])),
  box_id uuid REFERENCES public.boxes(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  opened_at timestamptz, closed_at timestamptz, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunities readable when discoverable" ON public.opportunities FOR SELECT TO authenticated
  USING (status IN ('open','matched','accepted','closed') OR creator_id = auth.uid());
CREATE POLICY "Creators insert own opportunities" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators update own opportunities" ON public.opportunities FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators delete own opportunities" ON public.opportunities FOR DELETE TO authenticated
  USING (creator_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_opportunities_status  ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_creator ON public.opportunities(creator_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_type    ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_source  ON public.opportunities(source_entity_type, source_entity_id);

CREATE TABLE IF NOT EXISTS public.opportunity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  applicant_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','shortlisted','matched','accepted','declined','withdrawn'])),
  relationship_id uuid REFERENCES public.advisor_relationships(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_applications TO authenticated;
GRANT ALL ON public.opportunity_applications TO service_role;
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apps visible to applicant and creator" ON public.opportunity_applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.creator_id = auth.uid()));
CREATE POLICY "Applicants create own application" ON public.opportunity_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.opportunities o
                          WHERE o.id = opportunity_id AND o.status = 'open' AND o.creator_id <> auth.uid()));
CREATE POLICY "Applicant or creator updates application" ON public.opportunity_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.creator_id = auth.uid()))
  WITH CHECK (applicant_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.creator_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_opp_apps_opportunity ON public.opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_apps_applicant   ON public.opportunity_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_opp_apps_status      ON public.opportunity_applications(status);

DROP TRIGGER IF EXISTS trg_opportunities_updated ON public.opportunities;
CREATE TRIGGER trg_opportunities_updated BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_opp_apps_updated ON public.opportunity_applications;
CREATE TRIGGER trg_opp_apps_updated BEFORE UPDATE ON public.opportunity_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.event_catalog (event_type, event_version, source_module, description) VALUES
  ('opportunity.created'::public.graph_event_type,  1, 'opportunity_graph', 'Opportunity record created (any status, incl. draft).'),
  ('opportunity.opened'::public.graph_event_type,   1, 'opportunity_graph', 'Opportunity transitioned to open and is discoverable.'),
  ('opportunity.applied'::public.graph_event_type,  1, 'opportunity_graph', 'Applicant submitted an application to an opportunity.'),
  ('opportunity.matched'::public.graph_event_type,  1, 'opportunity_graph', 'Creator shortlisted/matched an application.'),
  ('opportunity.accepted'::public.graph_event_type, 1, 'opportunity_graph', 'Creator accepted an applicant; relationship provisioned.'),
  ('opportunity.closed'::public.graph_event_type,   1, 'opportunity_graph', 'Opportunity closed (filled, withdrawn, or expired).')
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.emit_opportunity_event(
  _event_type public.graph_event_type, _actor_id uuid, _opportunity_id uuid, _payload jsonb, _idem text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.graph_events (event_type, user_id, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES (_event_type, _actor_id, 'opportunity', _opportunity_id, 'opportunity_graph',
          COALESCE(_payload,'{}'::jsonb) || jsonb_build_object('opportunity_id', _opportunity_id), _idem)
  ON CONFLICT (idempotency_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.emit_opportunity_event(public.graph_event_type, uuid, uuid, jsonb, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.tg_opportunity_lifecycle() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_opportunity_event('opportunity.created'::public.graph_event_type, NEW.creator_id, NEW.id,
      jsonb_build_object('type', NEW.type, 'status', NEW.status), 'opp:'||NEW.id||':created');
    IF NEW.status = 'open' THEN
      PERFORM public.emit_opportunity_event('opportunity.opened'::public.graph_event_type, NEW.creator_id, NEW.id,
        jsonb_build_object('type', NEW.type), 'opp:'||NEW.id||':opened');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'open' AND OLD.status <> 'open' THEN
      NEW.opened_at := COALESCE(NEW.opened_at, now());
      PERFORM public.emit_opportunity_event('opportunity.opened'::public.graph_event_type, NEW.creator_id, NEW.id,
        jsonb_build_object('type', NEW.type), 'opp:'||NEW.id||':opened');
    END IF;
    IF NEW.status IN ('closed','expired') AND OLD.status NOT IN ('closed','expired') THEN
      NEW.closed_at := COALESCE(NEW.closed_at, now());
      PERFORM public.emit_opportunity_event('opportunity.closed'::public.graph_event_type, NEW.creator_id, NEW.id,
        jsonb_build_object('reason', NEW.status), 'opp:'||NEW.id||':closed');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_opportunity_lifecycle ON public.opportunities;
CREATE TRIGGER trg_opportunity_lifecycle BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_opportunity_lifecycle();

CREATE OR REPLACE FUNCTION public.tg_opportunity_application_lifecycle() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _opp RECORD; _kind text; _rel_id uuid;
BEGIN
  SELECT * INTO _opp FROM public.opportunities WHERE id = NEW.opportunity_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_opportunity_event('opportunity.applied'::public.graph_event_type, NEW.applicant_id, NEW.opportunity_id,
      jsonb_build_object('application_id', NEW.id), 'opp_app:'||NEW.id||':applied');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'matched' AND OLD.status <> 'matched' THEN
      PERFORM public.emit_opportunity_event('opportunity.matched'::public.graph_event_type, _opp.creator_id, NEW.opportunity_id,
        jsonb_build_object('application_id', NEW.id, 'applicant_id', NEW.applicant_id),
        'opp_app:'||NEW.id||':matched');
    END IF;
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
      NEW.decided_at := COALESCE(NEW.decided_at, now());
      _kind := CASE _opp.type
        WHEN 'advisor'     THEN 'advisor'
        WHEN 'co_builder'  THEN 'teammate'
        WHEN 'hiring'      THEN 'teammate'
        WHEN 'partnership' THEN 'partner'
        WHEN 'investment'  THEN 'investor'
        WHEN 'consulting'  THEN 'collaborator'
        ELSE 'collaborator'
      END;
      IF NEW.relationship_id IS NULL THEN
        INSERT INTO public.advisor_relationships
          (advisor_id, user_id, box_id, origin_request_id, relationship_type, relationship_kind, status, metadata)
        VALUES
          (_opp.creator_id, NEW.applicant_id, _opp.box_id, NULL,
           CASE _kind WHEN 'advisor' THEN 'mentor' ELSE 'coach' END,
           _kind, 'active',
           jsonb_build_object('origin','opportunity','opportunity_id', _opp.id, 'application_id', NEW.id))
        ON CONFLICT (advisor_id, user_id, relationship_type) DO UPDATE
          SET status='active', metadata = public.advisor_relationships.metadata || EXCLUDED.metadata
        RETURNING id INTO _rel_id;
        NEW.relationship_id := _rel_id;
      END IF;
      PERFORM public.emit_opportunity_event('opportunity.accepted'::public.graph_event_type, _opp.creator_id, NEW.opportunity_id,
        jsonb_build_object('application_id', NEW.id, 'applicant_id', NEW.applicant_id, 'relationship_id', NEW.relationship_id),
        'opp_app:'||NEW.id||':accepted');
      UPDATE public.opportunities SET status = 'accepted' WHERE id = _opp.id AND status IN ('open','matched');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_opp_app_lifecycle ON public.opportunity_applications;
CREATE TRIGGER trg_opp_app_lifecycle BEFORE INSERT OR UPDATE ON public.opportunity_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_opportunity_application_lifecycle();
