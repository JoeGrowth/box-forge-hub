CREATE OR REPLACE FUNCTION public.admin_create_org_from_idea(_idea_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _idea record;
  _base_slug text;
  _slug text;
  _n int := 0;
  _org_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can create an organization from an idea';
  END IF;

  SELECT * INTO _idea FROM public.startup_ideas WHERE id = _idea_id;
  IF _idea.id IS NULL THEN
    RAISE EXCEPTION 'Idea not found';
  END IF;

  SELECT id INTO _org_id FROM public.organizations WHERE source_idea_id = _idea.id LIMIT 1;
  IF _org_id IS NOT NULL THEN
    RETURN _org_id;
  END IF;

  SELECT id INTO _org_id FROM public.organizations WHERE lower(name) = lower(_idea.title) LIMIT 1;
  IF _org_id IS NOT NULL THEN
    UPDATE public.organizations SET source_idea_id = _idea.id
     WHERE id = _org_id AND source_idea_id IS NULL;
    RETURN _org_id;
  END IF;

  _base_slug := public._slugify(_idea.title);
  IF _base_slug IS NULL OR length(_base_slug) = 0 THEN
    _base_slug := 'idea-' || substr(_idea.id::text, 1, 8);
  END IF;
  _slug := _base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base_slug || '-' || _n::text;
  END LOOP;

  INSERT INTO public.organizations (slug, name, type, description, created_by, source_idea_id)
  VALUES (_slug, _idea.title, 'startup', _idea.description, _idea.creator_id, _idea.id)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _idea.creator_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN _org_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_create_org_from_idea(uuid) TO authenticated;