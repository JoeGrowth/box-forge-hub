
-- 1) Extend opportunity_interactions with review workflow
ALTER TABLE public.opportunity_interactions
  ADD COLUMN IF NOT EXISTS reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Default existing rows to 'pending'
UPDATE public.opportunity_interactions SET status='pending' WHERE status='submitted';
ALTER TABLE public.opportunity_interactions ALTER COLUMN status SET DEFAULT 'pending';

-- Allow org managers to update tender interactions (accept/refuse)
DROP POLICY IF EXISTS "Org managers can update tender interactions" ON public.opportunity_interactions;
CREATE POLICY "Org managers can update tender interactions"
ON public.opportunity_interactions
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenders t
  WHERE t.id = opportunity_interactions.opportunity_id::uuid
    AND public.has_org_role(auth.uid(), t.organization_id, 'editor'::app_org_role)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tenders t
  WHERE t.id = opportunity_interactions.opportunity_id::uuid
    AND public.has_org_role(auth.uid(), t.organization_id, 'editor'::app_org_role)
));

-- 2) Tender submissions table
CREATE TABLE IF NOT EXISTS public.tender_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text,
  file_path text,
  file_name text,
  status text NOT NULL DEFAULT 'submitted',
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  paid_at timestamptz,
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tender_submissions TO authenticated;
GRANT ALL ON public.tender_submissions TO service_role;

ALTER TABLE public.tender_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors manage own submissions"
ON public.tender_submissions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org managers view submissions"
ON public.tender_submissions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenders t
  WHERE t.id = tender_submissions.tender_id
    AND public.has_org_role(auth.uid(), t.organization_id, 'viewer'::app_org_role)
));

CREATE POLICY "Org managers update submissions"
ON public.tender_submissions
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenders t
  WHERE t.id = tender_submissions.tender_id
    AND public.has_org_role(auth.uid(), t.organization_id, 'editor'::app_org_role)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tenders t
  WHERE t.id = tender_submissions.tender_id
    AND public.has_org_role(auth.uid(), t.organization_id, 'editor'::app_org_role)
));

CREATE POLICY "Admins view all submissions"
ON public.tender_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tender_submissions_updated_at
BEFORE UPDATE ON public.tender_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tender_submissions_tender ON public.tender_submissions(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_submissions_user ON public.tender_submissions(user_id);
