CREATE TABLE public.organization_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned',
  lead text,
  start_date date,
  target_date date,
  progress integer NOT NULL DEFAULT 0,
  created_by uuid,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_projects TO authenticated;
GRANT ALL ON public.organization_projects TO service_role;

ALTER TABLE public.organization_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org projects"
ON public.organization_projects FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_projects.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Editors can insert org projects"
ON public.organization_projects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_projects.organization_id AND m.user_id = auth.uid() AND m.role IN ('editor','admin')));

CREATE POLICY "Editors can update org projects"
ON public.organization_projects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_projects.organization_id AND m.user_id = auth.uid() AND m.role IN ('editor','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_projects.organization_id AND m.user_id = auth.uid() AND m.role IN ('editor','admin')));

CREATE POLICY "Editors can delete org projects"
ON public.organization_projects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_projects.organization_id AND m.user_id = auth.uid() AND m.role IN ('editor','admin')));

CREATE TRIGGER update_organization_projects_updated_at
BEFORE UPDATE ON public.organization_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();