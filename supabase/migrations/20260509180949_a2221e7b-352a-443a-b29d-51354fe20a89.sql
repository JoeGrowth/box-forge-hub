ALTER TABLE public.training_plans 
  ADD COLUMN IF NOT EXISTS service_name text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS client_name text;

UPDATE public.training_plans SET client_name = name WHERE client_name IS NULL;