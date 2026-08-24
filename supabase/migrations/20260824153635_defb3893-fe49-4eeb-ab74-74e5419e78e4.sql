CREATE TABLE public.distribution_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  charges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_models TO authenticated;
GRANT ALL ON public.distribution_models TO service_role;

ALTER TABLE public.distribution_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their distribution models"
ON public.distribution_models FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view org distribution models"
ON public.distribution_models FOR SELECT TO authenticated
USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org editors can manage org distribution models"
ON public.distribution_models FOR ALL TO authenticated
USING (org_id IS NOT NULL AND public.has_org_role(org_id, auth.uid(), 'editor'::app_org_role))
WITH CHECK (org_id IS NOT NULL AND public.has_org_role(org_id, auth.uid(), 'editor'::app_org_role));

CREATE TRIGGER update_distribution_models_updated_at
BEFORE UPDATE ON public.distribution_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();