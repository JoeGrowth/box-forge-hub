-- Add user status system fields to onboarding_state
ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS user_status text DEFAULT 'applied' CHECK (user_status IN ('applied', 'approved', 'boosted', 'scaled'));

ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS potential_role text CHECK (potential_role IS NULL OR potential_role IN ('potential_co_builder', 'potential_entrepreneur'));

ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS boost_type text CHECK (boost_type IS NULL OR boost_type IN ('boosted_co_builder', 'boosted_initiator', 'boosted_talent'));

ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS scale_type text CHECK (scale_type IS NULL OR scale_type IN ('venture_promise', 'personal_promise'));

-- Create index for faster user status queries
CREATE INDEX IF NOT EXISTS idx_onboarding_state_user_status ON public.onboarding_state(user_status);

-- Update existing users who have completed onboarding to 'applied' status
UPDATE public.onboarding_state 
SET user_status = 'applied' 
WHERE onboarding_completed = true AND user_status IS NULL;

-- Update existing approved users to 'approved' status
UPDATE public.onboarding_state 
SET user_status = 'approved' 
WHERE journey_status IN ('approved', 'entrepreneur_approved') AND user_status IS NULL;