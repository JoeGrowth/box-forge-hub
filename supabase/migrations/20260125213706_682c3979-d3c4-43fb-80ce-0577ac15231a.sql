-- Fix the startup_applications INSERT policy to allow both 'approved' and 'entrepreneur_approved' users
DROP POLICY IF EXISTS "Approved co-builders can apply" ON public.startup_applications;

CREATE POLICY "Approved co-builders can apply"
ON public.startup_applications
FOR INSERT
WITH CHECK (
  (auth.uid() = applicant_id) 
  AND (EXISTS (
    SELECT 1 FROM onboarding_state
    WHERE onboarding_state.user_id = auth.uid()
    AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
  ))
);