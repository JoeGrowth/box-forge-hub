DROP POLICY IF EXISTS "Approved co-builders can apply" ON public.startup_applications;
CREATE POLICY "Authenticated users can apply"
ON public.startup_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = applicant_id);