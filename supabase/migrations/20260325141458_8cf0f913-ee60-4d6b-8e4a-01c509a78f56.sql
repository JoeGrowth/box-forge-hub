ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS professional_title text,
  ADD COLUMN IF NOT EXISTS key_projects text,
  ADD COLUMN IF NOT EXISTS education_certifications text,
  ADD COLUMN IF NOT EXISTS summary_statement text;