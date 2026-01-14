-- Create a table to store team members for startup ideas
CREATE TABLE public.startup_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('MVCB', 'MMCB', 'MLCB')),
  added_by UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id, member_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.startup_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Startup creators can view their team members
CREATE POLICY "Creators can view their startup team members"
ON public.startup_team_members
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.startup_ideas
  WHERE startup_ideas.id = startup_team_members.startup_id
    AND startup_ideas.creator_id = auth.uid()
));

-- Startup creators can add team members
CREATE POLICY "Creators can add team members"
ON public.startup_team_members
FOR INSERT
WITH CHECK (
  auth.uid() = added_by
  AND EXISTS (
    SELECT 1 FROM public.startup_ideas
    WHERE startup_ideas.id = startup_team_members.startup_id
      AND startup_ideas.creator_id = auth.uid()
  )
);

-- Startup creators can remove team members
CREATE POLICY "Creators can remove team members"
ON public.startup_team_members
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.startup_ideas
  WHERE startup_ideas.id = startup_team_members.startup_id
    AND startup_ideas.creator_id = auth.uid()
));

-- Admins can manage all team members
CREATE POLICY "Admins can manage all team members"
ON public.startup_team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a table to track idea-specific journey progress
CREATE TABLE public.idea_journey_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phase_number INTEGER NOT NULL DEFAULT 0,
  phase_name TEXT NOT NULL,
  responses JSONB DEFAULT '{}'::jsonb,
  completed_tasks JSONB DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id, phase_number)
);

-- Enable Row Level Security
ALTER TABLE public.idea_journey_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Startup creators can view their journey progress
CREATE POLICY "Creators can view their idea journey progress"
ON public.idea_journey_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Startup creators can insert their journey progress
CREATE POLICY "Creators can insert their idea journey progress"
ON public.idea_journey_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Startup creators can update their journey progress
CREATE POLICY "Creators can update their idea journey progress"
ON public.idea_journey_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all journey progress
CREATE POLICY "Admins can view all idea journey progress"
ON public.idea_journey_progress
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_startup_team_members_updated_at
BEFORE UPDATE ON public.startup_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_idea_journey_progress_updated_at
BEFORE UPDATE ON public.idea_journey_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();