
-- Bidirectional sync between organizations and declaration_entities

CREATE OR REPLACE FUNCTION public.slugify_text(_input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.unique_org_slug(_base text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE base text := nullif(public.slugify_text(_base), ''); candidate text; n int := 0;
BEGIN
  IF base IS NULL THEN base := 'org'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END; $$;

-- Backfill declarations -> orgs
DO $$
DECLARE d record; matched_org_id uuid; new_slug text;
BEGIN
  FOR d IN SELECT * FROM public.declaration_entities WHERE organization_id IS NULL LOOP
    SELECT id INTO matched_org_id FROM public.organizations
    WHERE lower(name) = lower(d.name)
    ORDER BY (created_by = d.owner_id) DESC, created_at ASC LIMIT 1;

    IF matched_org_id IS NULL THEN
      new_slug := public.unique_org_slug(d.name);
      INSERT INTO public.organizations (name, slug, type, created_by)
      VALUES (d.name, new_slug, 'company', d.owner_id)
      RETURNING id INTO matched_org_id;
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (matched_org_id, d.owner_id, 'admin') ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.declaration_entities SET organization_id = matched_org_id WHERE id = d.id;
  END LOOP;
END $$;

-- Backfill orgs -> declarations (skip orgs whose owner no longer exists)
DO $$
DECLARE o record;
BEGIN
  FOR o IN
    SELECT org.* FROM public.organizations org
    JOIN auth.users u ON u.id = org.created_by
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.declaration_entities WHERE organization_id = o.id) THEN
      INSERT INTO public.declaration_entities (name, owner_id, organization_id)
      VALUES (o.name, o.created_by, o.id);
    END IF;
  END LOOP;
END $$;

-- Triggers
CREATE OR REPLACE FUNCTION public.sync_declaration_to_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE found_org uuid; new_slug text;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id INTO found_org FROM public.organizations
  WHERE lower(name) = lower(NEW.name)
  ORDER BY (created_by = NEW.owner_id) DESC, created_at ASC LIMIT 1;
  IF found_org IS NULL THEN
    new_slug := public.unique_org_slug(NEW.name);
    INSERT INTO public.organizations (name, slug, type, created_by)
    VALUES (NEW.name, new_slug, 'company', NEW.owner_id)
    RETURNING id INTO found_org;
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (found_org, NEW.owner_id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  NEW.organization_id := found_org;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_declaration_to_org ON public.declaration_entities;
CREATE TRIGGER trg_sync_declaration_to_org
BEFORE INSERT ON public.declaration_entities
FOR EACH ROW EXECUTE FUNCTION public.sync_declaration_to_org();

CREATE OR REPLACE FUNCTION public.sync_org_to_declaration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.declaration_entities
    WHERE organization_id = NEW.id
       OR (lower(name) = lower(NEW.name) AND owner_id = NEW.created_by)
  ) THEN
    INSERT INTO public.declaration_entities (name, owner_id, organization_id)
    VALUES (NEW.name, NEW.created_by, NEW.id);
  ELSE
    UPDATE public.declaration_entities
    SET organization_id = NEW.id
    WHERE organization_id IS NULL
      AND lower(name) = lower(NEW.name)
      AND owner_id = NEW.created_by;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_org_to_declaration ON public.organizations;
CREATE TRIGGER trg_sync_org_to_declaration
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.sync_org_to_declaration();
