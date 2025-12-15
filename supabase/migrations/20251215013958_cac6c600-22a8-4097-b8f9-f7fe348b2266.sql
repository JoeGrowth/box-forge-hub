-- Create table for entrepreneur journey responses
CREATE TABLE public.entrepreneur_journey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  
  -- Step 1: Vision
  vision TEXT,
  problem TEXT,
  market TEXT,
  
  -- Step 2: Business Model
  business_model TEXT,
  roles_needed TEXT,
  
  -- Step 3: Co-Builders
  cobuilder_plan TEXT,
  
  -- Step 4: Execution
  execution_plan TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.entrepreneur_journey_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view their own journey responses"
ON public.entrepreneur_journey_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert their own journey responses"
ON public.entrepreneur_journey_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update their own journey responses"
ON public.entrepreneur_journey_responses
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all responses
CREATE POLICY "Admins can view all journey responses"
ON public.entrepreneur_journey_responses
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_entrepreneur_journey_responses_updated_at
BEFORE UPDATE ON public.entrepreneur_journey_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();