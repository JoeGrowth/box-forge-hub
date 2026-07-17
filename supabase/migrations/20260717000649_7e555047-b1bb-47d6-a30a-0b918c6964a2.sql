
CREATE TABLE public.organization_product_name_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.organization_products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  previous_name TEXT NOT NULL,
  new_name TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.organization_product_name_history TO authenticated;
GRANT ALL ON public.organization_product_name_history TO service_role;

ALTER TABLE public.organization_product_name_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view product name history"
ON public.organization_product_name_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_product_name_history.organization_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Editors can log product name history"
ON public.organization_product_name_history
FOR INSERT
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = organization_product_name_history.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
  )
);

CREATE INDEX idx_product_name_history_product ON public.organization_product_name_history(product_id, changed_at DESC);
