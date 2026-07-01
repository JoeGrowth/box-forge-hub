
-- ============================================================================
-- Slice 1: Optional Profile Linking — Identity Layer (frozen plan)
-- ============================================================================

-- ---------- Enums ----------
CREATE TYPE public.entity_role_status AS ENUM ('pending','accepted','declined','revoked');
CREATE TYPE public.entity_role_transition AS ENUM ('requested','accepted','declined','revoked');
CREATE TYPE public.attribution_processing_state AS ENUM ('queued','processed','failed');

-- ---------- Reference: role_types ----------
CREATE TABLE public.role_types (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_types TO authenticated;
GRANT ALL ON public.role_types TO service_role;
ALTER TABLE public.role_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_types readable to authenticated"
  ON public.role_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_types admin write"
  ON public.role_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Reference: role_catalog (versioned) ----------
CREATE TABLE public.role_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug TEXT NOT NULL,
  role_type TEXT NOT NULL REFERENCES public.role_types(code),
  default_label TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['declaration_entity']::text[],
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_slug, version)
);
CREATE INDEX role_catalog_slug_effective_idx ON public.role_catalog(role_slug, effective_from DESC);
GRANT SELECT ON public.role_catalog TO authenticated;
GRANT ALL ON public.role_catalog TO service_role;
ALTER TABLE public.role_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_catalog readable to authenticated"
  ON public.role_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_catalog admin write"
  ON public.role_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Reference: role_attribution_policy (versioned) ----------
CREATE TABLE public.role_attribution_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL REFERENCES public.role_types(code),
  ownership_weight NUMERIC NOT NULL DEFAULT 0,
  expertise_weight NUMERIC NOT NULL DEFAULT 0,
  revenue_weight NUMERIC NOT NULL DEFAULT 0,
  trust_weight NUMERIC NOT NULL DEFAULT 0,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_type, version)
);
CREATE INDEX role_policy_type_effective_idx ON public.role_attribution_policy(role_type, effective_from DESC);
GRANT SELECT ON public.role_attribution_policy TO authenticated;
GRANT ALL ON public.role_attribution_policy TO service_role;
ALTER TABLE public.role_attribution_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_policy readable to authenticated"
  ON public.role_attribution_policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_policy admin write"
  ON public.role_attribution_policy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Source of truth: entity_role_assignments ----------
CREATE TABLE public.entity_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  role_slug TEXT NOT NULL,
  slot INT NOT NULL,
  label TEXT NOT NULL,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  equity_pct NUMERIC,
  status public.entity_role_status NOT NULL DEFAULT 'pending',
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, slot)
);
CREATE INDEX era_entity_idx ON public.entity_role_assignments(entity_type, entity_id);
CREATE INDEX era_user_idx ON public.entity_role_assignments(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE UNIQUE INDEX era_unique_active_user_per_entity
  ON public.entity_role_assignments(entity_type, entity_id, linked_user_id)
  WHERE status = 'accepted' AND linked_user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_role_assignments TO authenticated;
GRANT ALL ON public.entity_role_assignments TO service_role;
ALTER TABLE public.entity_role_assignments ENABLE ROW LEVEL SECURITY;

-- Reusable helper to detect entity admins.
CREATE OR REPLACE FUNCTION public.is_entity_admin(_entity_type TEXT, _entity_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  IF _entity_type = 'declaration_entity' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.declaration_entities de
      WHERE de.id = _entity_id
        AND (de.owner_id = _user_id
             OR (de.organization_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.organization_members m
               WHERE m.organization_id = de.organization_id
                 AND m.user_id = _user_id
                 AND m.role IN ('admin'::app_org_role,'editor'::app_org_role)
             ))
        )
    );
  ELSIF _entity_type = 'organization' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = _entity_id
        AND m.user_id = _user_id
        AND m.role IN ('admin'::app_org_role,'editor'::app_org_role)
    );
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_entity(_entity_type TEXT, _entity_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN FALSE; END IF;
  IF public.is_entity_admin(_entity_type, _entity_id, _user_id) THEN RETURN TRUE; END IF;
  IF _entity_type = 'declaration_entity' THEN
    RETURN public.is_declaration_entity_collaborator(_entity_id, _user_id);
  ELSIF _entity_type = 'organization' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = _entity_id AND m.user_id = _user_id
    );
  END IF;
  RETURN FALSE;
END;
$$;

CREATE POLICY "era read: entity viewers and linked user"
  ON public.entity_role_assignments FOR SELECT TO authenticated
  USING (
    linked_user_id = auth.uid()
    OR public.can_view_entity(entity_type, entity_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Direct writes are blocked; all lifecycle changes go through SECURITY DEFINER service functions.
CREATE POLICY "era admin bypass"
  ON public.entity_role_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER era_touch_updated_at
  BEFORE UPDATE ON public.entity_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Equity invariant: Σ equity_pct across accepted OWNER slots per entity ≤ 100
CREATE OR REPLACE FUNCTION public.enforce_owner_equity_sum()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF NEW.status = 'accepted' AND NEW.equity_pct IS NOT NULL THEN
    SELECT COALESCE(SUM(era.equity_pct),0) INTO v_total
    FROM public.entity_role_assignments era
    JOIN public.role_catalog rc ON rc.role_slug = era.role_slug
    WHERE era.entity_type = NEW.entity_type
      AND era.entity_id = NEW.entity_id
      AND era.status = 'accepted'
      AND era.id <> NEW.id
      AND rc.role_type = 'OWNER'
      AND rc.effective_until IS NULL;
    IF (v_total + COALESCE(NEW.equity_pct,0)) > 100.0001 THEN
      RAISE EXCEPTION 'Σ equity_pct across accepted OWNER assignments exceeds 100%% (would be %)', v_total + NEW.equity_pct;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER era_equity_sum_check
  BEFORE INSERT OR UPDATE ON public.entity_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_equity_sum();

-- ---------- Audit log ----------
CREATE TABLE public.entity_role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.entity_role_assignments(id) ON DELETE CASCADE,
  transition public.entity_role_transition NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX erial_assignment_idx ON public.entity_role_audit_log(assignment_id, at DESC);
GRANT SELECT ON public.entity_role_audit_log TO authenticated;
GRANT ALL ON public.entity_role_audit_log TO service_role;
ALTER TABLE public.entity_role_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erial read: same as assignment"
  ON public.entity_role_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entity_role_assignments era
    WHERE era.id = assignment_id
      AND (era.linked_user_id = auth.uid()
           OR public.can_view_entity(era.entity_type, era.entity_id, auth.uid())
           OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

-- ---------- Identity-stream projections ----------
CREATE TABLE public.verified_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  role_slug TEXT NOT NULL,
  role_type TEXT NOT NULL,
  source_assignment_id UUID REFERENCES public.entity_role_assignments(id) ON DELETE SET NULL,
  verified_since TIMESTAMPTZ NOT NULL,
  verified_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX va_profile_idx ON public.verified_affiliations(profile_id) WHERE active;
CREATE INDEX va_entity_idx ON public.verified_affiliations(entity_type, entity_id);
GRANT SELECT ON public.verified_affiliations TO authenticated;
GRANT ALL ON public.verified_affiliations TO service_role;
ALTER TABLE public.verified_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verified_affiliations readable to authenticated"
  ON public.verified_affiliations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ownership_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  equity_pct NUMERIC,
  source_assignment_id UUID REFERENCES public.entity_role_assignments(id) ON DELETE SET NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX oe_profile_idx ON public.ownership_edges(profile_id) WHERE active;
CREATE INDEX oe_entity_idx ON public.ownership_edges(entity_type, entity_id);
GRANT SELECT ON public.ownership_edges TO authenticated;
GRANT ALL ON public.ownership_edges TO service_role;
ALTER TABLE public.ownership_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ownership_edges readable to authenticated"
  ON public.ownership_edges FOR SELECT TO authenticated USING (true);

-- ---------- Activity stream stub: attribution_events ----------
CREATE TABLE public.attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_event_id UUID NOT NULL,
  source_event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.entity_role_assignments(id) ON DELETE SET NULL,
  role_slug TEXT NOT NULL,
  role_type TEXT NOT NULL,
  policy_version INT NOT NULL,
  ownership_weight NUMERIC NOT NULL DEFAULT 0,
  revenue_weight NUMERIC NOT NULL DEFAULT 0,
  expertise_weight NUMERIC NOT NULL DEFAULT 0,
  trust_weight NUMERIC NOT NULL DEFAULT 0,
  equity_pct NUMERIC,
  amount NUMERIC,
  currency TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_state public.attribution_processing_state NOT NULL DEFAULT 'queued',
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attr_user_idx ON public.attribution_events(user_id, occurred_at DESC);
CREATE INDEX attr_entity_idx ON public.attribution_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX attr_state_idx ON public.attribution_events(processing_state) WHERE processing_state <> 'processed';
GRANT SELECT ON public.attribution_events TO authenticated;
GRANT ALL ON public.attribution_events TO service_role;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attr read: owning user or entity admin"
  ON public.attribution_events FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_entity_admin(entity_type, entity_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------- Seeds: role_types, role_catalog, role_attribution_policy ----------
INSERT INTO public.role_types(code, description) VALUES
  ('OWNER','Equity holder / associé'),
  ('OPERATOR','Internal operator / handler'),
  ('ADVISOR','External advisor'),
  ('BOARD_MEMBER','Board member'),
  ('LEGAL_REPRESENTATIVE','Legal representative')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_catalog(role_slug, role_type, default_label, applies_to, effective_from, version) VALUES
  ('associe_1','OWNER','Associé 1', ARRAY['declaration_entity','organization']::text[], now(), 1),
  ('associe_2','OWNER','Associé 2', ARRAY['declaration_entity','organization']::text[], now(), 1),
  ('internal_structure','OPERATOR','Internal 1 – Structure Handler', ARRAY['declaration_entity','organization']::text[], now(), 1),
  ('internal_process','OPERATOR','Internal 2 – Process Handler', ARRAY['declaration_entity','organization']::text[], now(), 1)
ON CONFLICT (role_slug, version) DO NOTHING;

INSERT INTO public.role_attribution_policy(role_type, ownership_weight, expertise_weight, revenue_weight, trust_weight, effective_from, version) VALUES
  ('OWNER',   1.0, 0.2, 1.0, 0.5, now(), 1),
  ('OPERATOR', 0,  1.0, 0.4, 0.6, now(), 1),
  ('ADVISOR',  0,  0.6, 0.2, 0.4, now(), 1),
  ('BOARD_MEMBER', 0, 0.3, 0.1, 0.5, now(), 1),
  ('LEGAL_REPRESENTATIVE', 0, 0.1, 0, 0.3, now(), 1)
ON CONFLICT (role_type, version) DO NOTHING;

-- ---------- Helper: resolve catalog / policy versions at a point in time ----------
CREATE OR REPLACE FUNCTION public.resolve_role_catalog(_role_slug TEXT, _at TIMESTAMPTZ)
RETURNS public.role_catalog LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.role_catalog
  WHERE role_slug = _role_slug
    AND effective_from <= _at
    AND (effective_until IS NULL OR effective_until > _at)
  ORDER BY version DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_role_policy(_role_type TEXT, _at TIMESTAMPTZ)
RETURNS public.role_attribution_policy LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.role_attribution_policy
  WHERE role_type = _role_type
    AND effective_from <= _at
    AND (effective_until IS NULL OR effective_until > _at)
  ORDER BY version DESC LIMIT 1;
$$;

-- ---------- Domain service functions ----------
-- Ensure a declaration entity has its four canonical slots created (as unlinked labels).
CREATE OR REPLACE FUNCTION public.ensure_declaration_role_slots(_entity_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD; v_slot INT;
BEGIN
  v_slot := 0;
  FOR r IN
    SELECT role_slug, default_label FROM public.role_catalog
    WHERE role_slug IN ('associe_1','associe_2','internal_structure','internal_process')
      AND effective_until IS NULL
    ORDER BY CASE role_slug
      WHEN 'associe_1' THEN 1 WHEN 'associe_2' THEN 2
      WHEN 'internal_structure' THEN 3 WHEN 'internal_process' THEN 4 END
  LOOP
    v_slot := v_slot + 1;
    INSERT INTO public.entity_role_assignments(entity_type, entity_id, role_slug, slot, label)
    VALUES ('declaration_entity', _entity_id, r.role_slug, v_slot, r.default_label)
    ON CONFLICT (entity_type, entity_id, slot) DO NOTHING;
  END LOOP;
END;
$$;

-- Request link
CREATE OR REPLACE FUNCTION public.request_entity_role_link(
  _assignment_id UUID,
  _linked_user_id UUID,
  _equity_pct NUMERIC DEFAULT NULL,
  _label TEXT DEFAULT NULL
) RETURNS public.entity_role_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.entity_role_assignments; v_actor UUID; v_type TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_row FROM public.entity_role_assignments WHERE id = _assignment_id FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF NOT public.is_entity_admin(v_row.entity_type, v_row.entity_id, v_actor) THEN
    RAISE EXCEPTION 'not entity admin';
  END IF;
  IF v_row.status = 'accepted' THEN
    RAISE EXCEPTION 'slot already linked; revoke first';
  END IF;

  SELECT role_type INTO v_type FROM public.role_catalog WHERE role_slug = v_row.role_slug AND effective_until IS NULL ORDER BY version DESC LIMIT 1;
  IF v_type <> 'OWNER' THEN _equity_pct := NULL; END IF;

  UPDATE public.entity_role_assignments SET
    linked_user_id = _linked_user_id,
    equity_pct = COALESCE(_equity_pct, equity_pct),
    label = COALESCE(_label, label),
    status = 'pending',
    linked_by = v_actor,
    linked_at = now(),
    accepted_at = NULL, declined_at = NULL, revoked_at = NULL,
    effective_from = NULL, effective_until = NULL
  WHERE id = _assignment_id
  RETURNING * INTO v_row;

  INSERT INTO public.entity_role_audit_log(assignment_id, transition, actor_user_id, payload)
  VALUES (v_row.id,'requested',v_actor,
    jsonb_build_object('linked_user_id',_linked_user_id,'equity_pct',_equity_pct));

  -- Emit lifecycle event into graph_events (best-effort).
  BEGIN
    INSERT INTO public.graph_events(user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (v_actor, 'role.link.requested'::text::graph_event_type_enum, 1, 'entity_role', v_row.id,
      'entity_role_service',
      'role.link.requested:'||v_row.id::text||':'||extract(epoch from now())::text,
      jsonb_build_object('assignment_id',v_row.id,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id,
                         'role_slug',v_row.role_slug,'user_id',_linked_user_id),
      1, now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Notify target user
  BEGIN
    INSERT INTO public.user_notifications(user_id, notification_type, title, message, link)
    VALUES (_linked_user_id, 'role_link_request',
            'Role link requested',
            'You have been proposed for the "' || v_row.label || '" role. Accept or decline.',
            '/notifications');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Accept link
CREATE OR REPLACE FUNCTION public.accept_entity_role_link(_assignment_id UUID)
RETURNS public.entity_role_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.entity_role_assignments; v_actor UUID; v_type TEXT; v_now TIMESTAMPTZ;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_now := now();

  SELECT * INTO v_row FROM public.entity_role_assignments WHERE id = _assignment_id FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF v_row.linked_user_id IS NULL OR v_row.linked_user_id <> v_actor THEN
    RAISE EXCEPTION 'only the linked user may accept';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'assignment not pending';
  END IF;

  SELECT role_type INTO v_type FROM public.role_catalog WHERE role_slug = v_row.role_slug AND effective_until IS NULL ORDER BY version DESC LIMIT 1;

  UPDATE public.entity_role_assignments SET
    status = 'accepted', accepted_at = v_now, effective_from = v_now
  WHERE id = _assignment_id RETURNING * INTO v_row;

  INSERT INTO public.entity_role_audit_log(assignment_id, transition, actor_user_id)
  VALUES (v_row.id,'accepted',v_actor);

  -- Projection: verified_affiliations
  INSERT INTO public.verified_affiliations(profile_id, entity_type, entity_id, role_slug, role_type,
    source_assignment_id, verified_since, active)
  VALUES (v_actor, v_row.entity_type, v_row.entity_id, v_row.role_slug, v_type, v_row.id, v_now, TRUE);

  -- Projection: ownership_edges (OWNER only)
  IF v_type = 'OWNER' THEN
    INSERT INTO public.ownership_edges(profile_id, entity_type, entity_id, equity_pct,
      source_assignment_id, effective_from, active)
    VALUES (v_actor, v_row.entity_type, v_row.entity_id, v_row.equity_pct, v_row.id, v_now, TRUE);
  END IF;

  BEGIN
    INSERT INTO public.graph_events(user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (v_actor,'role.link.accepted'::text::graph_event_type_enum,1,'entity_role',v_row.id,
      'entity_role_service',
      'role.link.accepted:'||v_row.id::text||':'||extract(epoch from v_now)::text,
      jsonb_build_object('assignment_id',v_row.id,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id,
                         'role_slug',v_row.role_slug,'role_type',v_type,'equity_pct',v_row.equity_pct,
                         'effective_from',v_now),
      1,v_now);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Decline link
CREATE OR REPLACE FUNCTION public.decline_entity_role_link(_assignment_id UUID)
RETURNS public.entity_role_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.entity_role_assignments; v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_row FROM public.entity_role_assignments WHERE id = _assignment_id FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF v_row.linked_user_id IS NULL OR v_row.linked_user_id <> v_actor THEN
    RAISE EXCEPTION 'only the linked user may decline';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'assignment not pending';
  END IF;

  UPDATE public.entity_role_assignments SET
    status = 'declined', declined_at = now(),
    linked_user_id = NULL, equity_pct = NULL
  WHERE id = _assignment_id RETURNING * INTO v_row;

  INSERT INTO public.entity_role_audit_log(assignment_id, transition, actor_user_id)
  VALUES (v_row.id,'declined',v_actor);

  BEGIN
    INSERT INTO public.graph_events(user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (v_actor,'role.link.declined'::text::graph_event_type_enum,1,'entity_role',v_row.id,
      'entity_role_service',
      'role.link.declined:'||v_row.id::text||':'||extract(epoch from now())::text,
      jsonb_build_object('assignment_id',v_row.id),1,now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Revoke link
CREATE OR REPLACE FUNCTION public.revoke_entity_role_link(_assignment_id UUID)
RETURNS public.entity_role_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.entity_role_assignments; v_actor UUID; v_now TIMESTAMPTZ; v_type TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_now := now();

  SELECT * INTO v_row FROM public.entity_role_assignments WHERE id = _assignment_id FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF NOT public.is_entity_admin(v_row.entity_type, v_row.entity_id, v_actor) THEN
    RAISE EXCEPTION 'not entity admin';
  END IF;
  IF v_row.status <> 'accepted' THEN
    RAISE EXCEPTION 'assignment not accepted';
  END IF;

  SELECT role_type INTO v_type FROM public.role_catalog WHERE role_slug = v_row.role_slug AND effective_until IS NULL ORDER BY version DESC LIMIT 1;

  UPDATE public.entity_role_assignments SET
    status = 'revoked', revoked_at = v_now, effective_until = v_now
  WHERE id = _assignment_id RETURNING * INTO v_row;

  INSERT INTO public.entity_role_audit_log(assignment_id, transition, actor_user_id)
  VALUES (v_row.id,'revoked',v_actor);

  UPDATE public.verified_affiliations
     SET active = FALSE, verified_until = v_now
   WHERE source_assignment_id = v_row.id AND active;

  IF v_type = 'OWNER' THEN
    UPDATE public.ownership_edges
       SET active = FALSE, effective_until = v_now
     WHERE source_assignment_id = v_row.id AND active;
  END IF;

  BEGIN
    INSERT INTO public.graph_events(user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (v_actor,'role.link.revoked'::text::graph_event_type_enum,1,'entity_role',v_row.id,
      'entity_role_service',
      'role.link.revoked:'||v_row.id::text||':'||extract(epoch from v_now)::text,
      jsonb_build_object('assignment_id',v_row.id,'effective_until',v_now),1,v_now);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Grant execute on service functions
GRANT EXECUTE ON FUNCTION public.ensure_declaration_role_slots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_entity_role_link(UUID,UUID,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_entity_role_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_entity_role_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_entity_role_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_entity_admin(TEXT,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_entity(TEXT,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_role_catalog(TEXT,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_role_policy(TEXT,TIMESTAMPTZ) TO authenticated;

-- Auto-provision slots on new declaration entities
CREATE OR REPLACE FUNCTION public.on_declaration_entity_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_declaration_role_slots(NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER declaration_entity_provision_role_slots
  AFTER INSERT ON public.declaration_entities
  FOR EACH ROW EXECUTE FUNCTION public.on_declaration_entity_created();

-- Backfill for existing declaration entities
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.declaration_entities LOOP
    PERFORM public.ensure_declaration_role_slots(r.id);
  END LOOP;
END $$;

