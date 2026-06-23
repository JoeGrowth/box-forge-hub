ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_stage text;

UPDATE public.profiles p
SET current_stage = pg.current_state
FROM public.progression_graph pg
WHERE p.user_id = pg.user_id;

UPDATE public.profiles
SET current_stage = 'novice'
WHERE current_stage IS NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET current_stage = NEW.current_state
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_stage ON public.progression_graph;
CREATE TRIGGER sync_profile_stage
AFTER INSERT OR UPDATE OF current_state ON public.progression_graph
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_stage();