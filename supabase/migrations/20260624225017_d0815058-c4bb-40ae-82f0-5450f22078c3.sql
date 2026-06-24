ALTER TABLE public.team_compensation_offers
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.startup_applications(id) ON DELETE CASCADE;

ALTER TABLE public.team_compensation_offers
  ALTER COLUMN team_member_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_compensation_offers_application_unique
  ON public.team_compensation_offers(application_id)
  WHERE application_id IS NOT NULL AND team_member_id IS NULL;