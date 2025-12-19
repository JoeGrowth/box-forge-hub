-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "Approved co-builders can create startup ideas" ON public.startup_ideas;

-- Create new policy that allows both 'approved' and 'entrepreneur_approved' statuses
CREATE POLICY "Approved co-builders can create startup ideas" 
ON public.startup_ideas 
FOR INSERT 
WITH CHECK (
  (auth.uid() = creator_id) 
  AND (
    EXISTS (
      SELECT 1
      FROM onboarding_state
      WHERE onboarding_state.user_id = auth.uid() 
      AND onboarding_state.journey_status IN ('approved', 'entrepreneur_approved')
    )
  )
);