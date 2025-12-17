-- Allow approved co-builders to view profiles of other approved co-builders
CREATE POLICY "Approved co-builders can view other approved co-builders profiles"
ON public.profiles
FOR SELECT
USING (
  -- User must be approved
  EXISTS (
    SELECT 1 FROM public.onboarding_state
    WHERE onboarding_state.user_id = auth.uid()
    AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
  )
  -- Target profile must also be approved
  AND EXISTS (
    SELECT 1 FROM public.onboarding_state
    WHERE onboarding_state.user_id = profiles.user_id
    AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
  )
  -- Profile is not deleted
  AND (is_deleted = false OR is_deleted IS NULL)
);

-- Allow approved co-builders to view natural roles of other approved co-builders
CREATE POLICY "Approved co-builders can view other approved co-builders natural roles"
ON public.natural_roles
FOR SELECT
USING (
  -- User must be approved
  EXISTS (
    SELECT 1 FROM public.onboarding_state
    WHERE onboarding_state.user_id = auth.uid()
    AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
  )
  -- Target natural role must belong to an approved user
  AND EXISTS (
    SELECT 1 FROM public.onboarding_state
    WHERE onboarding_state.user_id = natural_roles.user_id
    AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
  )
);