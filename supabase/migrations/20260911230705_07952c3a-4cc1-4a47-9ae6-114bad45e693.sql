WITH ins AS (
  INSERT INTO public.startup_ideas (creator_id, title, description, status, is_looking_for_cobuilders, review_status, reviewed_at, current_episode, organization_id)
  SELECT o.created_by, o.name, COALESCE(NULLIF(o.description, ''), o.name || ' venture track.'), 'active', true, 'approved', now(), 'development', o.id
  FROM public.organizations o
  WHERE o.slug = 'dizy'
    AND o.source_idea_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.startup_ideas si WHERE si.organization_id = o.id)
  RETURNING id, organization_id
)
UPDATE public.organizations o SET source_idea_id = ins.id FROM ins WHERE o.id = ins.organization_id;