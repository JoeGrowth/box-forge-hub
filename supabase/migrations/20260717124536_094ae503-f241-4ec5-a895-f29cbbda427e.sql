ALTER TABLE public.organization_products ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.organization_product_iterations ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_org_products_archived ON public.organization_products(organization_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_org_product_iters_archived ON public.organization_product_iterations(product_id, archived_at);