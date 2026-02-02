-- Create consultant_opportunities table for tracking consulting work
CREATE TABLE public.consultant_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Source of opportunity
  source TEXT NOT NULL CHECK (source IN ('word_of_mouth', 'linkedin', 'other')),
  source_other TEXT, -- If source is 'other', specify here
  
  -- Opportunity details
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  consulting_firm TEXT NOT NULL,
  offer_date DATE NOT NULL,
  description TEXT,
  
  -- Technical offer PDF
  technical_offer_url TEXT,
  
  -- Financial offer
  number_of_days INTEGER NOT NULL DEFAULT 1,
  amount_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (number_of_days * amount_per_day) STORED,
  
  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultant_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own opportunities"
ON public.consultant_opportunities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opportunities"
ON public.consultant_opportunities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities"
ON public.consultant_opportunities
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunities"
ON public.consultant_opportunities
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all opportunities"
ON public.consultant_opportunities
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_consultant_opportunities_updated_at
BEFORE UPDATE ON public.consultant_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_consultant_opportunities_user_id ON public.consultant_opportunities(user_id);
CREATE INDEX idx_consultant_opportunities_offer_date ON public.consultant_opportunities(offer_date DESC);