-- 1. Extend role catalog with associe_3 / associe_4
INSERT INTO public.role_catalog(role_slug, role_type, default_label, applies_to, effective_from, version) VALUES
  ('associe_3','OWNER','Associé 3', ARRAY['declaration_entity','organization']::text[], now(), 1),
  ('associe_4','OWNER','Associé 4', ARRAY['declaration_entity','organization']::text[], now(), 1)
ON CONFLICT (role_slug, version) DO NOTHING;

-- 2. Seed role slots for an organization and auto-assign the initiator as Associé 1
CREATE OR REPLACE FUNCTION public.ensure_organization_role_slots(_org_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_slot INT := 0;
  v_initiator UUID;
BEGIN
  FOR r IN
    SELECT role_slug, default_label FROM public.role_catalog
    WHERE role_slug IN ('associe_1','associe_2','associe_3','associe_4','internal_structure','internal_process')
      AND effective_until IS NULL
    ORDER BY CASE role_slug
      WHEN 'associe_1' THEN 1 WHEN 'associe_2' THEN 2
      WHEN 'associe_3' THEN 3 WHEN 'associe_4' THEN 4
      WHEN 'internal_structure' THEN 5 WHEN 'internal_process' THEN 6 END
  LOOP
    v_slot := v_slot + 1;
    INSERT INTO public.entity_role_assignments(entity_type, entity_id, role_slug, slot, label)
    VALUES ('organization', _org_id, r.role_slug, v_slot, r.default_label)
    ON CONFLICT (entity_type, entity_id, slot) DO NOTHING;
  END LOOP;

  -- Initiator = creator of the source idea, else the organization creator
  SELECT COALESCE(si.creator_id, o.created_by) INTO v_initiator
  FROM public.organizations o
  LEFT JOIN public.startup_ideas si ON si.id = o.source_idea_id
  WHERE o.id = _org_id;

  IF v_initiator IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_initiator) THEN RETURN; END IF;

  -- Only claim slot 1 if it is free and the initiator holds no other accepted slot here
  UPDATE public.entity_role_assignments era
     SET linked_user_id = v_initiator,
         linked_by = v_initiator,
         linked_at = COALESCE(era.linked_at, now()),
         accepted_at = COALESCE(era.accepted_at, now()),
         effective_from = COALESCE(era.effective_from, now()),
         status = 'accepted'
   WHERE era.entity_type = 'organization'
     AND era.entity_id = _org_id
     AND era.role_slug = 'associe_1'
     AND era.linked_user_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.entity_role_assignments x
       WHERE x.entity_type = 'organization' AND x.entity_id = _org_id
         AND x.linked_user_id = v_initiator AND x.status = 'accepted'
     );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_organization_role_slots(UUID) FROM PUBLIC, anon;

-- 3. Trigger on organization creation
CREATE OR REPLACE FUNCTION public.on_organization_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_organization_role_slots(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_role_slots ON public.organizations;
CREATE TRIGGER organizations_seed_role_slots
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.on_organization_created();

-- Also re-run when an existing organization gets linked to a source idea later
CREATE OR REPLACE FUNCTION public.on_organization_source_idea_linked()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.source_idea_id IS DISTINCT FROM OLD.source_idea_id AND NEW.source_idea_id IS NOT NULL THEN
    PERFORM public.ensure_organization_role_slots(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_relink_role_slots ON public.organizations;
CREATE TRIGGER organizations_relink_role_slots
  AFTER UPDATE OF source_idea_id ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.on_organization_source_idea_linked();

-- 4. Backfill existing organizations
DO $$
DECLARE o RECORD;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_organization_role_slots(o.id);
  END LOOP;
END $$;

-- 5. Backfill Associé 2..4 from existing accepted startup team members (co-builders)
DO $$
DECLARE m RECORD; v_slug TEXT;
BEGIN
  FOR m IN
    SELECT o.id AS org_id, stm.member_user_id AS user_id,
           row_number() OVER (PARTITION BY o.id ORDER BY stm.created_at) AS rn
    FROM public.organizations o
    JOIN public.startup_team_members stm ON stm.startup_id = o.source_idea_id
    JOIN auth.users au ON au.id = stm.member_user_id
    WHERE o.source_idea_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.entity_role_assignments x
        WHERE x.entity_type = 'organization' AND x.entity_id = o.id
          AND x.linked_user_id = stm.member_user_id AND x.status = 'accepted'
      )
  LOOP
    IF m.rn > 3 THEN CONTINUE; END IF;
    v_slug := 'associe_' || (m.rn + 1)::text;
    UPDATE public.entity_role_assignments era
       SET linked_user_id = m.user_id,
           linked_at = COALESCE(era.linked_at, now()),
           accepted_at = COALESCE(era.accepted_at, now()),
           effective_from = COALESCE(era.effective_from, now()),
           status = 'accepted'
     WHERE era.entity_type = 'organization'
       AND era.entity_id = m.org_id
       AND era.role_slug = v_slug
       AND era.linked_user_id IS NULL;
  END LOOP;
END $$;