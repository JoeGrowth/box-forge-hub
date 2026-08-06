CREATE OR REPLACE FUNCTION public.sync_idea_initiator_from_associe1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_idea uuid;
  v_current uuid;
  v_title text;
BEGIN
  IF NEW.entity_type <> 'organization' OR NEW.role_slug <> 'associe_1'
     OR NEW.status <> 'accepted' OR NEW.linked_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.source_idea_id INTO v_idea
  FROM public.organizations o WHERE o.id = NEW.entity_id;
  IF v_idea IS NULL THEN RETURN NEW; END IF;

  SELECT creator_id, title INTO v_current, v_title
  FROM public.startup_ideas WHERE id = v_idea;
  IF v_current IS NULL OR v_current = NEW.linked_user_id THEN RETURN NEW; END IF;

  DELETE FROM public.startup_team_members
  WHERE startup_id = v_idea AND member_user_id = NEW.linked_user_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.startup_team_members
    WHERE startup_id = v_idea AND member_user_id = v_current
  ) THEN
    INSERT INTO public.startup_team_members (startup_id, member_user_id, role_type, added_by)
    VALUES (v_idea, v_current, 'MVCB', v_current);
  END IF;

  UPDATE public.startup_ideas
  SET creator_id = NEW.linked_user_id, updated_at = now()
  WHERE id = v_idea;

  INSERT INTO public.user_notifications (user_id, title, message, notification_type, link)
  VALUES
    (NEW.linked_user_id, 'Initiation transferred to you',
     'You are now the initiator of "' || COALESCE(v_title,'a project') || '" (Associé 1 of the organization).',
     'startup_transfer', '/startup/' || v_idea::text),
    (v_current, 'Initiation transferred',
     'Initiation of "' || COALESCE(v_title,'a project') || '" moved to the organization''s Associé 1. You remain a co-builder (MVCB).',
     'startup_transfer', '/startup/' || v_idea::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_idea_initiator_from_associe1 ON public.entity_role_assignments;
CREATE TRIGGER trg_sync_idea_initiator_from_associe1
AFTER INSERT OR UPDATE OF linked_user_id, status ON public.entity_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_idea_initiator_from_associe1();