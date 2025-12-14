-- Add policy for admins to update onboarding_state
CREATE POLICY "Admins can update all onboarding states" 
ON public.onboarding_state 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to view all onboarding states (if not exists, skip)
-- This policy already exists according to the schema