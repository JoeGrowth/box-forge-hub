ALTER TABLE public.consultant_opportunities
  ADD COLUMN IF NOT EXISTS opportunity_type TEXT;

ALTER TABLE public.consultant_opportunities
  ALTER COLUMN consulting_firm DROP NOT NULL;