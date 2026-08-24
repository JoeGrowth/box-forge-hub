DROP POLICY IF EXISTS "Org members can view org distribution entities" ON public.distribution_entities;
DROP POLICY IF EXISTS "Org editors can manage org distribution entities" ON public.distribution_entities;
DROP POLICY IF EXISTS "Org members can view org distribution categories" ON public.distribution_categories;
DROP POLICY IF EXISTS "Org editors can manage org distribution categories" ON public.distribution_categories;
DROP POLICY IF EXISTS "Org members can view org distribution records" ON public.distribution_records;
DROP POLICY IF EXISTS "Org editors can manage org distribution records" ON public.distribution_records;
DROP POLICY IF EXISTS "Org members can view org distribution models" ON public.distribution_models;
DROP POLICY IF EXISTS "Org editors can manage org distribution models" ON public.distribution_models;

CREATE POLICY "Org members can view org distribution entities"
ON public.distribution_entities FOR SELECT TO authenticated
USING (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org editors can manage org distribution entities"
ON public.distribution_entities FOR ALL TO authenticated
USING (org_id IS NOT NULL AND public.has_org_role(auth.uid(), org_id, 'editor'::app_org_role))
WITH CHECK (org_id IS NOT NULL AND public.has_org_role(auth.uid(), org_id, 'editor'::app_org_role));

CREATE POLICY "Org members can view org distribution categories"
ON public.distribution_categories FOR SELECT TO authenticated
USING (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.is_org_member(auth.uid(), public.distribution_entity_org(entity_id))
);

CREATE POLICY "Org editors can manage org distribution categories"
ON public.distribution_categories FOR ALL TO authenticated
USING (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.has_org_role(auth.uid(), public.distribution_entity_org(entity_id), 'editor'::app_org_role)
)
WITH CHECK (
  public.distribution_entity_org(entity_id) IS NOT NULL
  AND public.has_org_role(auth.uid(), public.distribution_entity_org(entity_id), 'editor'::app_org_role)
);

CREATE POLICY "Org members can view org distribution records"
ON public.distribution_records FOR SELECT TO authenticated
USING (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.is_org_member(auth.uid(), public.distribution_entity_org(split_part(kind, ':', 1)))
);

CREATE POLICY "Org editors can manage org distribution records"
ON public.distribution_records FOR ALL TO authenticated
USING (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.has_org_role(auth.uid(), public.distribution_entity_org(split_part(kind, ':', 1)), 'editor'::app_org_role)
)
WITH CHECK (
  public.distribution_entity_org(split_part(kind, ':', 1)) IS NOT NULL
  AND public.has_org_role(auth.uid(), public.distribution_entity_org(split_part(kind, ':', 1)), 'editor'::app_org_role)
);

CREATE POLICY "Org members can view org distribution models"
ON public.distribution_models FOR SELECT TO authenticated
USING (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org editors can manage org distribution models"
ON public.distribution_models FOR ALL TO authenticated
USING (org_id IS NOT NULL AND public.has_org_role(auth.uid(), org_id, 'editor'::app_org_role))
WITH CHECK (org_id IS NOT NULL AND public.has_org_role(auth.uid(), org_id, 'editor'::app_org_role));