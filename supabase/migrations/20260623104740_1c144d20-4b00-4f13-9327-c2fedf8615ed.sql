CREATE POLICY "Authenticated users can view all non-deleted profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING ((is_deleted = false) OR (is_deleted IS NULL));