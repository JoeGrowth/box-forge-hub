-- Add DELETE policy - only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));