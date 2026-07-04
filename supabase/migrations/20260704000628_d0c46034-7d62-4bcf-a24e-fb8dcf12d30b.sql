
-- 1. Relax NOT NULL on numeric fields so early-stage opportunities can be saved without pricing
ALTER TABLE public.consultant_opportunities
  ALTER COLUMN number_of_days DROP NOT NULL,
  ALTER COLUMN amount_per_day DROP NOT NULL,
  ALTER COLUMN client_name DROP NOT NULL,
  ALTER COLUMN consulting_firm DROP NOT NULL,
  ALTER COLUMN offer_date DROP NOT NULL;

-- 2. Pipeline stage + per-stage artefacts
DO $$ BEGIN
  CREATE TYPE public.consulting_stage AS ENUM (
    'identify','propose','confirm_prepare','deliver','payment_distribution','closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.consultant_opportunities
  ADD COLUMN IF NOT EXISTS stage public.consulting_stage NOT NULL DEFAULT 'identify',
  ADD COLUMN IF NOT EXISTS driver_file_url text,
  ADD COLUMN IF NOT EXISTS driver_note text,
  ADD COLUMN IF NOT EXISTS proposal_file_url text,
  ADD COLUMN IF NOT EXISTS proposal_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS process_file_url text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 3. Distribution splits per mission (associates or self)
CREATE TABLE IF NOT EXISTS public.consultant_opportunity_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.consultant_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipient_name text NOT NULL,
  recipient_user_id uuid,
  percent numeric,
  amount numeric,
  note text,
  declared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_opportunity_distributions TO authenticated;
GRANT ALL ON public.consultant_opportunity_distributions TO service_role;

ALTER TABLE public.consultant_opportunity_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own distributions"
  ON public.consultant_opportunity_distributions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cod_opp ON public.consultant_opportunity_distributions(opportunity_id);

CREATE TRIGGER update_cod_updated_at
  BEFORE UPDATE ON public.consultant_opportunity_distributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage policies for the private "consulting-opportunities" bucket
-- Files are stored under "<user_id>/<opportunity_id>/<stage>-<filename>"
CREATE POLICY "Users read own consulting files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'consulting-opportunities' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own consulting files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consulting-opportunities' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own consulting files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'consulting-opportunities' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own consulting files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consulting-opportunities' AND auth.uid()::text = (storage.foldername(name))[1]);
