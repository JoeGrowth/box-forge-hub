CREATE OR REPLACE FUNCTION public.transfer_startup_initiation(
  _startup_id uuid,
  _new_initiator_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_creator uuid;
BEGIN
  SELECT creator_id INTO _current_creator FROM public.startup_ideas WHERE id = _startup_id;
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
  ) THEN
    RAISE EXCEPTION 'Target user is not a certified initiator';
  END IF;
  -- Add current creator as co-builder (MVCB) before transfer
  INSERT INTO public.startup_team_members (startup_id, member_user_id, role_type, added_by)
  VALUES (_startup_id, _current_creator, 'MVCB', _current_creator)
  ON CONFLICT (startup_id, member_user_id) DO NOTHING;
  -- Remove new initiator from team members if present
  DELETE FROM public.startup_team_members
  WHERE startup_id = _startup_id AND member_user_id = _new_initiator_id;
  -- Transfer initiation
  UPDATE public.startup_ideas
  SET creator_id = _new_initiator_id, updated_at = now()
  WHERE id = _startup_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_startup_initiation(uuid, uuid) TO authenticated;