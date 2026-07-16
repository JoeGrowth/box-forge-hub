
ALTER TABLE public.startup_ideas
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_startup_ideas_organization_id ON public.startup_ideas(organization_id);
