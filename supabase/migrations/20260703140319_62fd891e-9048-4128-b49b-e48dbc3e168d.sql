
-- 1. Link organizations to source startup ideas
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS source_idea_id uuid REFERENCES public.startup_ideas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_source_idea_id_key
  ON public.organizations(source_idea_id) WHERE source_idea_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._slugify(_txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_txt,'')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.auto_create_org_for_mvp_idea()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hit boolean := false;
  _base_slug text;
  _slug text;
  _n int := 0;
  _new_org_id uuid;
  _existing_id uuid;
BEGIN
  IF (NEW.solution_stage = 'validated' AND (OLD.solution_stage IS DISTINCT FROM 'validated')) THEN
    _hit := true;
  END IF;
  IF (NEW.ladder_product_at IS NOT NULL AND OLD.ladder_product_at IS NULL) THEN
    _hit := true;
  END IF;
  IF NOT _hit THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE source_idea_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- If an org with the same name already exists, just link it (best effort)
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

DROP TRIGGER IF EXISTS trg_auto_create_org_for_mvp_idea ON public.startup_ideas;
CREATE TRIGGER trg_auto_create_org_for_mvp_idea
AFTER UPDATE ON public.startup_ideas
FOR EACH ROW EXECUTE FUNCTION public.auto_create_org_for_mvp_idea();

-- Backfill: link existing orgs by matching name; create new ones otherwise.
DO $$
DECLARE
  _idea record;
  _base_slug text;
  _slug text;
  _n int;
  _new_org_id uuid;
  _existing_id uuid;
BEGIN
  FOR _idea IN
    SELECT i.*
    FROM public.startup_ideas i
    LEFT JOIN public.organizations o ON o.source_idea_id = i.id
    WHERE o.id IS NULL
      AND (i.solution_stage = 'validated' OR i.ladder_product_at IS NOT NULL)
  LOOP
    SELECT id INTO _existing_id FROM public.organizations
     WHERE lower(name) = lower(_idea.title) LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      UPDATE public.organizations SET source_idea_id = _idea.id
       WHERE id = _existing_id AND source_idea_id IS NULL;
      CONTINUE;
    END IF;

    _base_slug := public._slugify(_idea.title);
    IF _base_slug IS NULL OR length(_base_slug) = 0 THEN
      _base_slug := 'idea-' || substr(_idea.id::text, 1, 8);
    END IF;
    _slug := _base_slug;
    _n := 0;
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
      _n := _n + 1;
      _slug := _base_slug || '-' || _n::text;
    END LOOP;

    INSERT INTO public.organizations (slug, name, type, description, created_by, source_idea_id)
    VALUES (_slug, _idea.title, 'startup', _idea.description, _idea.creator_id, _idea.id)
    RETURNING id INTO _new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_new_org_id, _idea.creator_id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
