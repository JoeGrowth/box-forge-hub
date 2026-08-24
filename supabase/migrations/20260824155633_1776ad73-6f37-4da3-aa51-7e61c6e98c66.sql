-- Resolve the org of a distribution entity without tripping RLS recursion
CREATE OR REPLACE FUNCTION public.distribution_entity_org(_entity_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.distribution_entities WHERE id = _entity_id LIMIT 1
$$;

-- Entities: org members read, org editors manage
CREATE POLICY "Org members can view org distribution entities"
ON public.distribution_entities
FOR SELECT
TO authenticated
USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org editors can manage org distribution entities"
ON public.distribution_entities
FOR ALL
TO authenticated
USING (org_id IS NOT NULL AND public.has_org_role(org_id, auth.uid(), 'editor'::app_org_role))
WITH CHECK (org_id IS NOT NULL AND public.has_org_role(org_id, auth.uid(), 'editor'::app_org_role));

-- Categories: scoped through their entity's org
CREATE POLICY "Org members can view org distribution categories"
ON public.distribution_categories
FOR SELECT
TO authenticated
USING (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.is_org_member(public.distribution_entity_org(entity_id), auth.uid())
);

CREATE POLICY "Org editors can manage org distribution categories"
ON public.distribution_categories
FOR ALL
TO authenticated
USING (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.has_org_role(public.distribution_entity_org(entity_id), auth.uid(), 'editor'::app_org_role)
)
WITH CHECK (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.has_org_role(public.distribution_entity_org(entity_id), auth.uid(), 'editor'::app_org_role)
);

-- Saved missions: kind is "<entityId>:<categoryId>"
CREATE POLICY "Org members can view org distribution records"
ON public.distribution_records
FOR SELECT
TO authenticated
USING (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.is_org_member(public.distribution_entity_org(split_part(kind, ':', 1)), auth.uid())
);

CREATE POLICY "Org editors can manage org distribution records"
ON public.distribution_records
FOR ALL
TO authenticated
USING (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.has_org_role(public.distribution_entity_org(split_part(kind, ':', 1)), auth.uid(), 'editor'::app_org_role)
)
WITH CHECK (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.has_org_role(public.distribution_entity_org(split_part(kind, ':', 1)), auth.uid(), 'editor'::app_org_role)
);