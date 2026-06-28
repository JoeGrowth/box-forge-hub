
ALTER TABLE public.declaration_entities ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_declaration_entities_org ON public.declaration_entities(organization_id);

-- Allow org admins/editors to view & manage declarations belonging to the org
DROP POLICY IF EXISTS "org members can view org declarations" ON public.declaration_entities;
CREATE POLICY "org members can view org declarations"
ON public.declaration_entities FOR SELECT
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = declaration_entities.organization_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "org editors manage org declarations" ON public.declaration_entities;
CREATE POLICY "org editors manage org declarations"
ON public.declaration_entities FOR ALL
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = declaration_entities.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
)
WITH CHECK (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = declaration_entities.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
);

-- Mirror for missions so they're visible to org members for the linked entity
DROP POLICY IF EXISTS "org members view org entity missions" ON public.declaration_missions;
CREATE POLICY "org members view org entity missions"
ON public.declaration_missions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.declaration_entities e
    JOIN public.organization_members m ON m.organization_id = e.organization_id
    WHERE e.id = declaration_missions.entity_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "org editors manage org entity missions" ON public.declaration_missions;
CREATE POLICY "org editors manage org entity missions"
ON public.declaration_missions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.declaration_entities e
    JOIN public.organization_members m ON m.organization_id = e.organization_id
    WHERE e.id = declaration_missions.entity_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.declaration_entities e
    JOIN public.organization_members m ON m.organization_id = e.organization_id
    WHERE e.id = declaration_missions.entity_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
);
