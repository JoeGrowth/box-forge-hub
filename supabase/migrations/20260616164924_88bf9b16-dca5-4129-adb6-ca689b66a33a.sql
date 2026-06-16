CREATE TABLE IF NOT EXISTS public.job_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  company text,
  location text,
  salary_range text,
  employment_type text,
  sector text,
  requirements text,
  contact_info text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_opportunities TO authenticated;
GRANT ALL ON public.job_opportunities TO service_role;

ALTER TABLE public.job_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published jobs"
  ON public.job_opportunities FOR SELECT
  TO authenticated
  USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create jobs"
  ON public.job_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update their jobs"
  ON public.job_opportunities FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can delete their jobs"
  ON public.job_opportunities FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_job_opportunities_updated_at
  BEFORE UPDATE ON public.job_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();