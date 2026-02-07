-- Add cancellation_reason column to team_compensation_offers
ALTER TABLE public.team_compensation_offers 
ADD COLUMN cancellation_reason text DEFAULT NULL;