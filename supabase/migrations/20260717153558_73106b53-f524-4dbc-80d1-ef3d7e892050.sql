DROP POLICY IF EXISTS "Org managers can view tender interactions" ON public.opportunity_interactions;

CREATE POLICY "Org managers can view tender interactions"
  ON public.opportunity_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = (opportunity_interactions.opportunity_id)::uuid
        AND public.has_org_role(auth.uid(), t.organization_id, 'editor')
    )
  );