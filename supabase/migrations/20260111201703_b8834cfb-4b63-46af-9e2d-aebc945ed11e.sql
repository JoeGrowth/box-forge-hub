
-- Drop the existing policy
DROP POLICY IF EXISTS "Approved co-builders can create startup ideas" ON public.startup_ideas;

-- Create new policy that requires initiator_b4 certification
CREATE POLICY "Certified initiators can create startup ideas"
ON public.startup_ideas
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id 
  AND EXISTS (
    SELECT 1 FROM user_certifications
    WHERE user_certifications.user_id = auth.uid()
    AND user_certifications.certification_type = 'initiator_b4'
  )
);
