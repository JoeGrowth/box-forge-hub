-- Create table for onboarding answer versions
CREATE TABLE public.onboarding_answer_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Natural role fields snapshot
  description TEXT,
  practice_entities TEXT,
  practice_case_studies INTEGER,
  training_contexts TEXT,
  training_count INTEGER,
  consulting_with_whom TEXT,
  consulting_case_studies TEXT,
  
  -- Check statuses snapshot
  promise_check BOOLEAN,
  practice_check BOOLEAN,
  training_check BOOLEAN,
  consulting_check BOOLEAN,
  wants_to_scale BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.onboarding_answer_versions ENABLE ROW LEVEL SECURITY;

-- Users can view their own versions
CREATE POLICY "Users can view their own answer versions"
ON public.onboarding_answer_versions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own versions
CREATE POLICY "Users can create their own answer versions"
ON public.onboarding_answer_versions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all versions
CREATE POLICY "Admins can view all answer versions"
ON public.onboarding_answer_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient querying
CREATE INDEX idx_onboarding_versions_user_id ON public.onboarding_answer_versions(user_id);
CREATE INDEX idx_onboarding_versions_created_at ON public.onboarding_answer_versions(created_at DESC);