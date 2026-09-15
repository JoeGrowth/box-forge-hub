DO $$
DECLARE v_org public.organizations; v_idea_id uuid;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = 'f417a7a9-9786-4463-bcec-13e7d7d31c1f';
  SELECT id INTO v_idea_id FROM public.startup_ideas WHERE organization_id = v_org.id LIMIT 1;
  IF v_idea_id IS NULL THEN
    INSERT INTO public.startup_ideas (creator_id, title, description, status, is_looking_for_cobuilders, review_status, reviewed_at, current_episode, organization_id)
    VALUES (v_org.created_by, v_org.name, COALESCE(NULLIF(v_org.description, ''), v_org.name || ' venture track.'), 'active', true, 'approved', now(), 'development', v_org.id)
    RETURNING id INTO v_idea_id;
  END IF;
  UPDATE public.organizations SET source_idea_id = v_idea_id WHERE id = v_org.id;
END $$;