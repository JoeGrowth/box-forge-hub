
ALTER TABLE public.onboarding_state ADD COLUMN IF NOT EXISTS procuring_access boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  sector text,
  budget_range text,
  deadline date,
  location text,
  requirements text,
  contact_info text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published tenders"
  ON public.tenders FOR SELECT
  TO authenticated
  USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "Procuring users can create tenders"
  ON public.tenders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.onboarding_state os
      WHERE os.user_id = auth.uid() AND os.procuring_access = true
    )
  );

CREATE POLICY "Owners can update their tenders"
  ON public.tenders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can delete their tenders"
  ON public.tenders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
