-- Add journey approval status to onboarding_state
ALTER TABLE public.onboarding_state 
ADD COLUMN journey_status text DEFAULT 'in_progress' CHECK (journey_status IN ('in_progress', 'pending_approval', 'approved', 'rejected'));

-- Create startup_ideas table for co-build opportunities
CREATE TABLE public.startup_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sector TEXT,
  roles_needed TEXT[], -- Array of roles needed for this startup
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'closed')),
  is_looking_for_cobuilders BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on startup_ideas
ALTER TABLE public.startup_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for startup_ideas
-- Anyone authenticated can view active startup ideas
CREATE POLICY "Authenticated users can view active startup ideas"
ON public.startup_ideas
FOR SELECT
USING (auth.uid() IS NOT NULL AND (status = 'active' OR creator_id = auth.uid()));

-- Only approved co-builders can create startup ideas (as initiators)
CREATE POLICY "Approved co-builders can create startup ideas"
ON public.startup_ideas
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id AND 
  EXISTS (
    SELECT 1 FROM public.onboarding_state 
    WHERE user_id = auth.uid() 
    AND journey_status = 'approved'
  )
);

-- Creators can update their own startup ideas
CREATE POLICY "Creators can update their own startup ideas"
ON public.startup_ideas
FOR UPDATE
USING (auth.uid() = creator_id);

-- Creators can delete their own startup ideas
CREATE POLICY "Creators can delete their own startup ideas"
ON public.startup_ideas
FOR DELETE
USING (auth.uid() = creator_id);

-- Admins can manage all startup ideas
CREATE POLICY "Admins can manage all startup ideas"
ON public.startup_ideas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on startup_ideas
CREATE TRIGGER update_startup_ideas_updated_at
BEFORE UPDATE ON public.startup_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing completed onboarding users to pending_approval status
UPDATE public.onboarding_state 
SET journey_status = 'pending_approval' 
WHERE onboarding_completed = true AND journey_status = 'in_progress';