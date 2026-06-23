CREATE OR REPLACE FUNCTION public.sync_onboarding_state_from_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL THEN
    INSERT INTO public.onboarding_state (
      user_id,
      onboarding_completed,
      current_step,
      journey_status,
      user_status,
      updated_at
    )
    VALUES (
      NEW.user_id,
      true,
      5,
      'pending_approval',
      'applied',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      onboarding_completed = true,
      current_step = GREATEST(COALESCE(public.onboarding_state.current_step, 1), 5),
      journey_status = CASE
        WHEN public.onboarding_state.journey_status IN ('approved', 'entrepreneur_approved') THEN public.onboarding_state.journey_status
        ELSE 'pending_approval'
      END,
      user_status = CASE
        WHEN public.onboarding_state.user_status IN ('approved', 'boosted', 'scaled') THEN public.onboarding_state.user_status
        ELSE 'applied'
      END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_onboarding_state_from_session ON public.onboarding_sessions;
CREATE TRIGGER trg_sync_onboarding_state_from_session
AFTER INSERT OR UPDATE OF completed_at, current_step, completed_steps
ON public.onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_onboarding_state_from_session();