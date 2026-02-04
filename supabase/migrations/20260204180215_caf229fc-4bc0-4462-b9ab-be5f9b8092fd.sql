-- Create compensation offers table for team member compensation negotiation
CREATE TABLE public.team_compensation_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.startup_team_members(id) ON DELETE CASCADE,
  cobuilder_user_id UUID NOT NULL,
  initiator_user_id UUID NOT NULL,
  
  -- Monthly salary (optional)
  monthly_salary NUMERIC DEFAULT NULL,
  salary_currency TEXT DEFAULT 'USD',
  
  -- Time-based equity
  time_equity_percentage NUMERIC DEFAULT 0,
  cliff_years INTEGER DEFAULT 1,
  vesting_years INTEGER DEFAULT 4,
  
  -- Performance-based equity  
  performance_equity_percentage NUMERIC DEFAULT 0,
  performance_milestone TEXT DEFAULT NULL,
  
  -- Negotiation tracking
  current_proposer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, counter_proposed
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique per team member (only one active offer at a time)
  UNIQUE(team_member_id)
);

-- Create compensation offer history for tracking negotiation rounds
CREATE TABLE public.team_compensation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.team_compensation_offers(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL,
  
  -- Snapshot of the offer at this version
  monthly_salary NUMERIC DEFAULT NULL,
  salary_currency TEXT DEFAULT 'USD',
  time_equity_percentage NUMERIC DEFAULT 0,
  cliff_years INTEGER DEFAULT 1,
  vesting_years INTEGER DEFAULT 4,
  performance_equity_percentage NUMERIC DEFAULT 0,
  performance_milestone TEXT DEFAULT NULL,
  
  version INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'proposed', 'counter_proposed', 'accepted'
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_compensation_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_compensation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_compensation_offers
CREATE POLICY "Initiators can manage their startup offers"
ON public.team_compensation_offers
FOR ALL
USING (auth.uid() = initiator_user_id);

CREATE POLICY "Co-builders can view and update offers for them"
ON public.team_compensation_offers
FOR ALL
USING (auth.uid() = cobuilder_user_id);

CREATE POLICY "Admins can manage all offers"
ON public.team_compensation_offers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for team_compensation_history
CREATE POLICY "Participants can view offer history"
ON public.team_compensation_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.team_compensation_offers o
  WHERE o.id = offer_id
  AND (o.initiator_user_id = auth.uid() OR o.cobuilder_user_id = auth.uid())
));

CREATE POLICY "Participants can insert offer history"
ON public.team_compensation_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.team_compensation_offers o
  WHERE o.id = offer_id
  AND (o.initiator_user_id = auth.uid() OR o.cobuilder_user_id = auth.uid())
));

CREATE POLICY "Admins can view all history"
ON public.team_compensation_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_team_compensation_offers_updated_at
BEFORE UPDATE ON public.team_compensation_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();