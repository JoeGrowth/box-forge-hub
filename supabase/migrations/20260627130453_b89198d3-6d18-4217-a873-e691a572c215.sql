CREATE OR REPLACE FUNCTION public.can_view_advisors_directory()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.box_ecosystem_admins
      WHERE user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_advisors_directory() TO authenticated;