
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
  -- Fire only when the project reaches MVP (current_episode = 'validation')
  IF (NEW.current_episode = 'validation'
      AND (OLD.current_episode IS DISTINCT FROM 'validation')) THEN
    _hit := true;
  END IF;
  IF NOT _hit THEN RETURN NEW; END IF;

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

-- Remove auto-created orgs whose source project is no longer (or never was) at MVP stage
DELETE FROM public.organizations o
USING public.startup_ideas i
WHERE o.source_idea_id = i.id
  AND i.current_episode IS DISTINCT FROM 'validation';

-- Backfill: create orgs for existing MVP-stage ideas that don't have one yet
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
      AND i.current_episode = 'validation'
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
