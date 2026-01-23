-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view certifications" ON public.user_certifications;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view certifications"
ON public.user_certifications
FOR SELECT
USING (auth.uid() IS NOT NULL);