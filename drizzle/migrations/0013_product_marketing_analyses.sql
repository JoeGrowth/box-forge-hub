CREATE TABLE public.product_marketing_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.organization_products(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  offer_kind text NOT NULL CHECK (offer_kind IN ('service','digital_product','product')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_marketing_analyses TO authenticated;
GRANT ALL ON public.product_marketing_analyses TO service_role;
ALTER TABLE public.product_marketing_analyses ENABLE ROW LEVEL SECURITY;
CREATE INDEX product_marketing_analyses_org_idx ON public.product_marketing_analyses(organization_id, product_id);
CREATE POLICY "Org members read marketing analyses" ON public.product_marketing_analyses FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members create marketing analyses" ON public.product_marketing_analyses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Org members update marketing analyses" ON public.product_marketing_analyses FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members delete marketing analyses" ON public.product_marketing_analyses FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_org_role(auth.uid(), organization_id, 'admin'::app_org_role) OR public.has_role(auth.uid(), 'admin'::app_role));