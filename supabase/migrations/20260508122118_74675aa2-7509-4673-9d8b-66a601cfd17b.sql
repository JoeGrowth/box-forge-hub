-- Training plans table
CREATE TABLE public.training_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Training',
  mission_sold_at NUMERIC NOT NULL DEFAULT 0,
  broker_pct NUMERIC NOT NULL DEFAULT 0,
  charge_mission NUMERIC NOT NULL DEFAULT 0,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

-- Training plan shares (by email)
CREATE TABLE public.training_plan_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, shared_with_email)
);

ALTER TABLE public.training_plan_shares ENABLE ROW LEVEL SECURITY;

-- Helper: lower email of current user
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(email) FROM auth.users WHERE id = auth.uid()
$$;

-- Helper: is plan shared with current user
CREATE OR REPLACE FUNCTION public.is_plan_shared_with_me(_plan_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_plan_shares
    WHERE plan_id = _plan_id
      AND lower(shared_with_email) = public.current_user_email()
  )
$$;

-- RLS: training_plans
CREATE POLICY "Owners can view own plans"
  ON public.training_plans FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Shared users can view plans"
  ON public.training_plans FOR SELECT
  USING (public.is_plan_shared_with_me(id));

CREATE POLICY "Owners can insert own plans"
  ON public.training_plans FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own plans"
  ON public.training_plans FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Shared users can update plans"
  ON public.training_plans FOR UPDATE
  USING (public.is_plan_shared_with_me(id));

CREATE POLICY "Owners can delete own plans"
  ON public.training_plans FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS: training_plan_shares
CREATE POLICY "Plan owners can view shares"
  ON public.training_plan_shares FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_plans tp WHERE tp.id = plan_id AND tp.owner_id = auth.uid()));

CREATE POLICY "Recipients can view their own share"
  ON public.training_plan_shares FOR SELECT
  USING (lower(shared_with_email) = public.current_user_email());

CREATE POLICY "Plan owners can insert shares"
  ON public.training_plan_shares FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_plans tp WHERE tp.id = plan_id AND tp.owner_id = auth.uid()));

CREATE POLICY "Plan owners can delete shares"
  ON public.training_plan_shares FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.training_plans tp WHERE tp.id = plan_id AND tp.owner_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_training_plans_updated_at
BEFORE UPDATE ON public.training_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();