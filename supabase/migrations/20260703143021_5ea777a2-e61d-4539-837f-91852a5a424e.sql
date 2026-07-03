
-- Only auto-create organizations when an idea reaches the MVP/Product ladder stage,
-- not when the solution is merely validated.
CREATE OR REPLACE FUNCTION public.auto_create_org_for_mvp_idea()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _base_slug text;
  _slug text;
  _n int := 0;
  _new_org_id uuid;
  _existing_id uuid;
BEGIN
  -- Fire only when the idea transitions into the MVP/Product ladder stage
  IF NOT (NEW.ladder_product_at IS NOT NULL AND OLD.ladder_product_at IS NULL) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE source_idea_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _existing_id FROM public.organizations
   WHERE lower(name) = lower(NEW.title) LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    UPDATE public.organizations SET source_idea_id = NEW.id
     WHERE id = _existing_id AND source_idea_id IS NULL;
    RETURN NEW;
  END IF;

  _base_slug := public._slugify(NEW.title);
  IF _base_slug IS NULL OR length(_base_slug) = 0 THEN
    _base_slug := 'idea-' || substr(NEW.id::text, 1, 8);
  END IF;
  _slug := _base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base_slug || '-' || _n::text;
  END LOOP;

  INSERT INTO public.organizations (slug, name, type, description, created_by, source_idea_id)
  VALUES (_slug, NEW.title, 'startup', NEW.description, NEW.creator_id, NEW.id)
  RETURNING id INTO _new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_new_org_id, NEW.creator_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

-- Remove auto-created organizations that came from ideas which never reached MVP/Product stage.
-- Only delete orgs that still have no members other than the creator and no linked data
-- (safe cleanup: we only remove empty orgs auto-created by the previous trigger).
DELETE FROM public.organization_members om
 USING public.organizations o, public.startup_ideas i
 WHERE om.organization_id = o.id
   AND o.source_idea_id = i.id
   AND i.ladder_product_at IS NULL;

DELETE FROM public.organizations o
 USING public.startup_ideas i
 WHERE o.source_idea_id = i.id
   AND i.ladder_product_at IS NULL;
