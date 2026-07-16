ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS name_history text[] NOT NULL DEFAULT '{}';