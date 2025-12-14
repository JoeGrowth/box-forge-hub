-- Add additional profile fields for entrepreneur/cobuilder applications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS startup_name text,
ADD COLUMN IF NOT EXISTS preferred_sector text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS primary_skills text,
ADD COLUMN IF NOT EXISTS years_of_experience integer,
ADD COLUMN IF NOT EXISTS organization_name text,
ADD COLUMN IF NOT EXISTS partnership_interest text;