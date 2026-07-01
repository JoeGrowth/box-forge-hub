
CREATE TABLE public.distribution_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('consulting','training','event')),
  title TEXT NOT NULL,
  budget_label TEXT NOT NULL DEFAULT 'Budget',
  budget NUMERIC NOT NULL DEFAULT 0,
  charges JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  people JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_records TO authenticated;
GRANT ALL ON public.distribution_records TO service_role;
ALTER TABLE public.distribution_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own distribution records"
ON public.distribution_records FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_distribution_records_updated_at
BEFORE UPDATE ON public.distribution_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
