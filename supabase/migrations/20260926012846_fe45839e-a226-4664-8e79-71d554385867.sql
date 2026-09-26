INSERT INTO public.role_catalog(role_slug, role_type, default_label, applies_to, version)
SELECT s, 'OPERATOR', l, ARRAY['declaration_entity','organization'], 1
FROM (VALUES ('internal_broker','Internal 3 – Broker'),('internal_admin','Internal 4 – Administration'),('internal_qa','Internal 5 – Quality Assurance')) v(s,l)
WHERE NOT EXISTS (SELECT 1 FROM public.role_catalog c WHERE c.role_slug = v.s);

CREATE OR REPLACE FUNCTION public.ensure_declaration_role_slots(_entity_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r RECORD; v_slot INT;
BEGIN
  FOR r IN
    SELECT role_slug, default_label FROM public.role_catalog
    WHERE role_slug IN ('associe_1','associe_2','internal_structure','internal_process','internal_broker','internal_admin','internal_qa')
      AND effective_until IS NULL
    ORDER BY CASE role_slug
      WHEN 'associe_1' THEN 1 WHEN 'associe_2' THEN 2
      WHEN 'internal_structure' THEN 3 WHEN 'internal_process' THEN 4
      WHEN 'internal_broker' THEN 5 WHEN 'internal_admin' THEN 6 WHEN 'internal_qa' THEN 7 END
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.entity_role_assignments
                   WHERE entity_type='declaration_entity' AND entity_id=_entity_id AND role_slug=r.role_slug) THEN
      SELECT COALESCE(MAX(slot),0)+1 INTO v_slot FROM public.entity_role_assignments
        WHERE entity_type='declaration_entity' AND entity_id=_entity_id;
      INSERT INTO public.entity_role_assignments(entity_type, entity_id, role_slug, slot, label)
      VALUES ('declaration_entity', _entity_id, r.role_slug, v_slot, r.default_label)
      ON CONFLICT (entity_type, entity_id, slot) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

DO $$ DECLARE e RECORD; BEGIN
  FOR e IN SELECT id FROM public.declaration_entities LOOP
    PERFORM public.ensure_declaration_role_slots(e.id);
  END LOOP;
END $$;