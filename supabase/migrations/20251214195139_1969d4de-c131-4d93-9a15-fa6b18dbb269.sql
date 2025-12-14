-- Onboarding state tracking
CREATE TABLE public.onboarding_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  primary_role TEXT CHECK (primary_role IN ('entrepreneur', 'cobuilder')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Natural Role data for Co-Builders
CREATE TABLE public.natural_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'defined', 'assistance_requested', 'not_ready')),
  
  -- Assessment fields
  promise_check BOOLEAN,
  
  practice_check BOOLEAN,
  practice_entities TEXT,
  practice_case_studies INTEGER,
  practice_needs_help BOOLEAN DEFAULT FALSE,
  
  training_check BOOLEAN,
  training_count INTEGER,
  training_contexts TEXT,
  training_needs_help BOOLEAN DEFAULT FALSE,
  
  consulting_check BOOLEAN,
  consulting_with_whom TEXT,
  consulting_case_studies TEXT,
  
  -- Readiness
  is_ready BOOLEAN DEFAULT FALSE,
  wants_to_scale BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin notifications for assistance requests
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('nr_help_requested', 'practice_help', 'training_help', 'user_stuck', 'scaling_candidate', 'user_ready')),
  user_name TEXT,
  user_email TEXT,
  nr_description TEXT,
  step_name TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natural_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Onboarding state policies
CREATE POLICY "Users can view their own onboarding state"
  ON public.onboarding_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding state"
  ON public.onboarding_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding state"
  ON public.onboarding_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding states"
  ON public.onboarding_state FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Natural roles policies
CREATE POLICY "Users can view their own natural role"
  ON public.natural_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own natural role"
  ON public.natural_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own natural role"
  ON public.natural_roles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all natural roles"
  ON public.natural_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin notifications policies
CREATE POLICY "Users can insert notifications about themselves"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_onboarding_state_updated_at
  BEFORE UPDATE ON public.onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_natural_roles_updated_at
  BEFORE UPDATE ON public.natural_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();