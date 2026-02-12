
-- Create table for entrepreneurial onboarding responses
CREATE TABLE public.entrepreneurial_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  has_developed_project BOOLEAN,
  project_description TEXT,
  project_count INTEGER,
  project_needs_help BOOLEAN DEFAULT false,
  has_built_product BOOLEAN,
  product_description TEXT,
  product_count INTEGER,
  product_needs_help BOOLEAN DEFAULT false,
  has_run_business BOOLEAN,
  business_description TEXT,
  business_count INTEGER,
  business_needs_help BOOLEAN DEFAULT false,
  has_served_on_board BOOLEAN,
  board_description TEXT,
  board_count INTEGER,
  board_needs_help BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.entrepreneurial_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entrepreneurial onboarding"
ON public.entrepreneurial_onboarding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entrepreneurial onboarding"
ON public.entrepreneurial_onboarding FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entrepreneurial onboarding"
ON public.entrepreneurial_onboarding FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all entrepreneurial onboarding"
ON public.entrepreneurial_onboarding FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_entrepreneurial_onboarding_updated_at
BEFORE UPDATE ON public.entrepreneurial_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
