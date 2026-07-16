
CREATE TABLE public.organization_product_iterations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  implementation_type TEXT,
  url TEXT,
  shipped_at DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_product_iterations TO authenticated;
GRANT ALL ON public.organization_product_iterations TO service_role;

ALTER TABLE public.organization_product_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org product iterations"
ON public.organization_product_iterations FOR SELECT
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_product_iterations.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Editors+admins can insert org product iterations"
ON public.organization_product_iterations FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_product_iterations.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE POLICY "Editors+admins can update org product iterations"
ON public.organization_product_iterations FOR UPDATE
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_product_iterations.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE POLICY "Editors+admins can delete org product iterations"
ON public.organization_product_iterations FOR DELETE
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_product_iterations.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE TRIGGER update_org_product_iterations_updated_at
BEFORE UPDATE ON public.organization_product_iterations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_org_product_iterations_org ON public.organization_product_iterations(organization_id, version_number);
