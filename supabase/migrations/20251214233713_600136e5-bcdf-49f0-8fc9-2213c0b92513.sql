-- Drop the existing check constraint on journey_status
ALTER TABLE public.onboarding_state 
DROP CONSTRAINT IF EXISTS onboarding_state_journey_status_check;

-- Add updated check constraint with new entrepreneur statuses
ALTER TABLE public.onboarding_state 
ADD CONSTRAINT onboarding_state_journey_status_check 
CHECK (journey_status IN ('in_progress', 'pending_approval', 'approved', 'rejected', 'entrepreneur_approved', 'entrepreneur_in_progress'));