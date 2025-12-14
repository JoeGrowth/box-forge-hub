-- Add new columns to startup_ideas for entrepreneur review workflow
ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending' CHECK (review_status IN ('pending', 'under_review', 'approved', 'rejected'));

-- Add admin notes for the review
ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add reviewed_at timestamp
ALTER TABLE public.startup_ideas 
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Allow admins to view all startup ideas including pending ones
DROP POLICY IF EXISTS "Admins can manage all startup ideas" ON public.startup_ideas;
CREATE POLICY "Admins can manage all startup ideas" 
ON public.startup_ideas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add entrepreneur_journey_step to onboarding_state for guided entrepreneur flow
ALTER TABLE public.onboarding_state 
ADD COLUMN IF NOT EXISTS entrepreneur_step integer DEFAULT 0;