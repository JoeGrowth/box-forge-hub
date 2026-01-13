-- Add retry_count column to track onboarding retry attempts
ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;