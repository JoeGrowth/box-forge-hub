DROP POLICY IF EXISTS org_people_read ON public.organization_people;
CREATE POLICY org_people_read_members ON public.organization_people
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.list_org_people_public(_org_id uuid)
RETURNS TABLE (id uuid, full_name text, tier text, crew_type text, activities_count integer, years_contribution numeric, has_expertise boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.tier::text, p.crew_type::text, p.activities_count::integer, p.years_contribution::numeric, p.has_expertise
  FROM public.organization_people p
  WHERE p.organization_id = _org_id AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.list_org_people_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_people_public(uuid) TO authenticated;