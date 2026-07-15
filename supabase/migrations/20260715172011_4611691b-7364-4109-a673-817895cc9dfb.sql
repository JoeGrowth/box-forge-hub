ALTER TABLE public.team_compensation_offers ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE public.team_compensation_history ADD COLUMN IF NOT EXISTS role_title TEXT;