-- Create enum for journey types
CREATE TYPE public.journey_type AS ENUM (
  'skill_ptc',      -- Co-Build a Startup path
  'idea_ptc',       -- Be an Initiator path
  'scaling_path'    -- Natural Role Scaling path
);

-- Create enum for journey status
CREATE TYPE public.journey_status AS ENUM (
  'not_started',
  'in_progress',
  'pending_approval',
  'approved',
  'rejected'
);

-- Main table to track user's learning journeys
CREATE TABLE public.learning_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  journey_type journey_type NOT NULL,
  current_phase INTEGER NOT NULL DEFAULT 0,
  status journey_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, journey_type)
);

-- Table to store user's responses/progress for each phase
CREATE TABLE public.journey_phase_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.learning_journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  -- For form-based questions
  responses JSONB DEFAULT '{}',
  -- For checklist tasks
  completed_tasks JSONB DEFAULT '[]',
  -- For file uploads
  uploaded_files JSONB DEFAULT '[]',
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(journey_id, phase_number)
);

-- Table to track user badges/certifications
CREATE TABLE public.user_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certification_type TEXT NOT NULL, -- 'cobuilder_b4', 'initiator_b4', 'scaling_complete'
  display_label TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, certification_type)
);

-- Enable RLS
ALTER TABLE public.learning_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_phase_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_journeys
CREATE POLICY "Users can view their own journeys"
ON public.learning_journeys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journeys"
ON public.learning_journeys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journeys"
ON public.learning_journeys FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all journeys"
ON public.learning_journeys FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all journeys"
ON public.learning_journeys FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for journey_phase_responses
CREATE POLICY "Users can view their own phase responses"
ON public.journey_phase_responses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phase responses"
ON public.journey_phase_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phase responses"
ON public.journey_phase_responses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all phase responses"
ON public.journey_phase_responses FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_certifications
CREATE POLICY "Anyone can view certifications"
ON public.user_certifications FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert certifications"
ON public.user_certifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update certifications"
ON public.user_certifications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete certifications"
ON public.user_certifications FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_learning_journeys_updated_at
BEFORE UPDATE ON public.learning_journeys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journey_phase_responses_updated_at
BEFORE UPDATE ON public.journey_phase_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();