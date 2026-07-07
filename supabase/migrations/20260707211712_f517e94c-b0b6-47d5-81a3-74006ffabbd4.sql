
-- Consulting venture state (one row per user)
CREATE TABLE public.consulting_venture_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_phase text NOT NULL DEFAULT 'branding' CHECK (current_phase IN ('branding','systematization','asset')),
  branding_completed_at timestamptz,
  systematization_completed_at timestamptz,
  asset_reached_at timestamptz,
  selected_model text CHECK (selected_model IS NULL OR selected_model IN ('boutique_firm','decentralized_network','consulting_platform','training_academy')),
  company_name text,
  company_registration text,
  proposal_template_url text,
  frameworks_url text,
  software_tools text,
  datasets_methodologies text,
  training_courses text,
  autonomous_operations boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_venture_state TO authenticated;
GRANT ALL ON public.consulting_venture_state TO service_role;

ALTER TABLE public.consulting_venture_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own state read" ON public.consulting_venture_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own state insert" ON public.consulting_venture_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own state update" ON public.consulting_venture_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own state delete" ON public.consulting_venture_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Manual milestone completion (auto milestones computed from other tables)
CREATE TABLE public.consulting_venture_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_venture_milestones TO authenticated;
GRANT ALL ON public.consulting_venture_milestones TO service_role;

ALTER TABLE public.consulting_venture_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own milestones read" ON public.consulting_venture_milestones
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own milestones insert" ON public.consulting_venture_milestones
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own milestones update" ON public.consulting_venture_milestones
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own milestones delete" ON public.consulting_venture_milestones
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_consulting_venture_state_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_consulting_venture_state_touch
BEFORE UPDATE ON public.consulting_venture_state
FOR EACH ROW EXECUTE FUNCTION public.tg_consulting_venture_state_touch();
