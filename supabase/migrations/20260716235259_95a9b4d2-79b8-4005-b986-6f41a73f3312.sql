
CREATE TABLE public.organization_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_products TO authenticated;
GRANT ALL ON public.organization_products TO service_role;

ALTER TABLE public.organization_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org products"
ON public.organization_products FOR SELECT
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_products.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Editors+admins can insert org products"
ON public.organization_products FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_products.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE POLICY "Editors+admins can update org products"
ON public.organization_products FOR UPDATE
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_products.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE POLICY "Editors+admins can delete org products"
ON public.organization_products FOR DELETE
USING (EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = organization_products.organization_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['editor'::app_org_role, 'admin'::app_org_role])));

CREATE TRIGGER update_org_products_updated_at
BEFORE UPDATE ON public.organization_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_org_products_org ON public.organization_products(organization_id, position);

ALTER TABLE public.organization_product_iterations
  ADD COLUMN product_id uuid REFERENCES public.organization_products(id) ON DELETE CASCADE;

-- Backfill: create a default product per org with existing iterations
INSERT INTO public.organization_products (organization_id, name, position, created_by)
SELECT DISTINCT ON (i.organization_id)
  i.organization_id,
  'Product Journey (1)',
  1,
  i.created_by
FROM public.organization_product_iterations i
WHERE i.product_id IS NULL;

UPDATE public.organization_product_iterations i
SET product_id = p.id
FROM public.organization_products p
WHERE i.product_id IS NULL
  AND p.organization_id = i.organization_id
  AND p.position = 1;

CREATE INDEX idx_org_product_iterations_product ON public.organization_product_iterations(product_id, version_number);
