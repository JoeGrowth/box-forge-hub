CREATE OR REPLACE FUNCTION public.link_organization_to_legacy(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations;
  v_idea_id uuid;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = _org_id;
  IF v_org.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF NOT (public.has_org_role(auth.uid(), _org_id, 'admin') OR public.has_role(auth.uid(), 'admin') OR v_org.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_org.source_idea_id IS NOT NULL THEN
    RETURN v_org.source_idea_id;
  END IF;

  SELECT id INTO v_idea_id FROM public.startup_ideas WHERE organization_id = _org_id LIMIT 1;

  IF v_idea_id IS NULL THEN
    INSERT INTO public.startup_ideas (creator_id, title, description, status, is_looking_for_cobuilders, review_status, reviewed_at, current_episode, organization_id)
    VALUES (
      COALESCE(v_org.created_by, auth.uid()),
      v_org.name,
      COALESCE(NULLIF(v_org.description, ''), v_org.name || ' venture track.'),
      'active',
      true,
      'approved',
      now(),
      'development',
      _org_id
    )
    RETURNING id INTO v_idea_id;
  END IF;

  UPDATE public.organizations SET source_idea_id = v_idea_id WHERE id = _org_id;

  RETURN v_idea_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_organization_to_legacy(uuid) TO authenticated;