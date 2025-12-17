-- Allow approved co-builders to view onboarding_state of other approved co-builders
CREATE POLICY "Approved co-builders can view other approved onboarding states"
ON public.onboarding_state
FOR SELECT
USING (
  -- User must be approved
  EXISTS (
    SELECT 1 FROM public.onboarding_state os
    WHERE os.user_id = auth.uid()
    AND os.journey_status IN ('approved', 'entrepreneur_approved')
  )
  -- Target must also be approved
  AND journey_status IN ('approved', 'entrepreneur_approved')
);