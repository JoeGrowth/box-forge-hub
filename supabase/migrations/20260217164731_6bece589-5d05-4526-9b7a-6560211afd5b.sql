
-- Create training opportunities table
CREATE TABLE public.training_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience TEXT,
  duration TEXT,
  format TEXT,
  sector TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_opportunities ENABLE ROW LEVEL SECURITY;

-- Users can insert their own training opportunities
CREATE POLICY "Users can insert their own trainings"
ON public.training_opportunities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own training opportunities
CREATE POLICY "Users can view their own trainings"
ON public.training_opportunities
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own pending training opportunities
CREATE POLICY "Users can update their own pending trainings"
ON public.training_opportunities
FOR UPDATE
USING (auth.uid() = user_id AND review_status = 'pending');

-- Users can delete their own pending training opportunities
CREATE POLICY "Users can delete their own pending trainings"
ON public.training_opportunities
FOR DELETE
USING (auth.uid() = user_id AND review_status = 'pending');

-- Admins can manage all training opportunities
CREATE POLICY "Admins can manage all trainings"
ON public.training_opportunities
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Approved co-builders can view approved trainings
CREATE POLICY "Approved users can view approved trainings"
ON public.training_opportunities
FOR SELECT
USING (auth.uid() IS NOT NULL AND review_status = 'approved');

-- Add updated_at trigger
CREATE TRIGGER update_training_opportunities_updated_at
BEFORE UPDATE ON public.training_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
