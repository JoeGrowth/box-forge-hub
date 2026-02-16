
-- Add consultant_access column to onboarding_state
ALTER TABLE public.onboarding_state ADD COLUMN consultant_access boolean DEFAULT false;

-- Auto-enable for users who already have consultant_b4 certification
UPDATE public.onboarding_state
SET consultant_access = true
WHERE user_id IN (
  SELECT user_id FROM public.user_certifications WHERE certification_type = 'consultant_b4'
);
