CREATE OR REPLACE FUNCTION public.tg_recompute_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'startup_team_members' THEN
    _user_id := COALESCE(NEW.member_user_id, OLD.member_user_id);
  ELSE
    _user_id := COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  IF _user_id IS NOT NULL THEN
    PERFORM public.recompute_advisor_readiness(_user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;