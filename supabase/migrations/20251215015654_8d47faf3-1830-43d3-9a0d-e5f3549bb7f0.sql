-- Create startup applications table for co-builders to apply to opportunities
CREATE TABLE public.startup_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  role_applied TEXT,
  cover_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.startup_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own applications
CREATE POLICY "Users can view their own applications" 
ON public.startup_applications 
FOR SELECT 
USING (auth.uid() = applicant_id);

-- Startup creators can view applications to their startups
CREATE POLICY "Creators can view applications to their startups" 
ON public.startup_applications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.startup_ideas 
    WHERE id = startup_id AND creator_id = auth.uid()
  )
);

-- Approved co-builders can insert applications
CREATE POLICY "Approved co-builders can apply" 
ON public.startup_applications 
FOR INSERT 
WITH CHECK (
  auth.uid() = applicant_id AND
  EXISTS (
    SELECT 1 FROM public.onboarding_state 
    WHERE user_id = auth.uid() AND journey_status = 'approved'
  )
);

-- Startup creators can update application status
CREATE POLICY "Creators can update application status" 
ON public.startup_applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.startup_ideas 
    WHERE id = startup_id AND creator_id = auth.uid()
  )
);

-- Applicants can delete their own pending applications
CREATE POLICY "Applicants can delete pending applications" 
ON public.startup_applications 
FOR DELETE 
USING (auth.uid() = applicant_id AND status = 'pending');

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" 
ON public.startup_applications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications" 
ON public.startup_applications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_startup_applications_updated_at
BEFORE UPDATE ON public.startup_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();