CREATE TABLE public.organization_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('friend','crew','mentor')),
  crew_type TEXT CHECK (crew_type IN ('chouch_ward','ch3ir','helba')),
  has_expertise BOOLEAN NOT NULL DEFAULT false,
  activities_count INTEGER NOT NULL DEFAULT 0,
  years_contribution NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_people TO authenticated;
GRANT ALL ON public.organization_people TO service_role;

ALTER TABLE public.organization_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_people_read" ON public.organization_people
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "org_people_write" ON public.organization_people
  FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'editor'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'editor'));

CREATE TRIGGER organization_people_updated_at
  BEFORE UPDATE ON public.organization_people
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();