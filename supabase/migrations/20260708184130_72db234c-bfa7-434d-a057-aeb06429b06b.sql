CREATE OR REPLACE FUNCTION public.transfer_startup_initiation(_startup_id uuid, _new_initiator_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_creator uuid;
  _startup_title text;
BEGIN
  SELECT creator_id, title INTO _current_creator, _startup_title FROM public.startup_ideas WHERE id = _startup_id;
  IF _current_creator IS NULL THEN
    RAISE EXCEPTION 'Startup not found';
  END IF;
  IF _current_creator <> auth.uid() THEN
    RAISE EXCEPTION 'Only the current initiator can transfer initiation';
  END IF;
  IF _current_creator = _new_initiator_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_certifications
    WHERE user_id = _new_initiator_id AND certification_type = 'initiator_b4'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.startup_ideas WHERE creator_id = _new_initiator_id
  ) THEN
    RAISE EXCEPTION 'Target user is not an initiator';
  END IF;

  DELETE FROM public.startup_team_members
  WHERE startup_id = _startup_id AND member_user_id = _new_initiator_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.startup_team_members
    WHERE startup_id = _startup_id AND member_user_id = _current_creator
  ) THEN
    INSERT INTO public.startup_team_members (startup_id, member_user_id, role_type, added_by)
    VALUES (_startup_id, _current_creator, 'MVCB', _current_creator);
  END IF;

  UPDATE public.startup_ideas
  SET creator_id = _new_initiator_id, updated_at = now()
  WHERE id = _startup_id;

  -- Notify the new initiator
  INSERT INTO public.user_notifications (user_id, title, message, notification_type, link)
  VALUES (
    _new_initiator_id,
    'Initiation transferred to you',
    'You are now the initiator of "' || COALESCE(_startup_title, 'a startup') || '". The previous initiator has been added as a co-builder (MVCB).',
    'startup_transfer',
    '/startup/' || _startup_id::text
  );

  -- Notify the previous initiator (confirmation)
  INSERT INTO public.user_notifications (user_id, title, message, notification_type, link)
  VALUES (
    _current_creator,
    'Initiation transferred',
    'You transferred initiation of "' || COALESCE(_startup_title, 'a startup') || '". You are now a co-builder (MVCB).',
    'startup_transfer',
    '/startup/' || _startup_id::text
  );
END;
$function$;