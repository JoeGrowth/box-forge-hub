
-- Onboarding session tracking
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step SMALLINT NOT NULL DEFAULT 1,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_intent TEXT,
  goal TEXT,
  availability JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_sessions TO service_role;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own onboarding session"
  ON public.onboarding_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all onboarding sessions"
  ON public.onboarding_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend graph_event_type with P0.6 analytics labels
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'onboarding_started';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'onboarding_step_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'onboarding_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'first_recommendations_viewed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'first_recommendation_clicked';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'cold_start_updated';

-- State derivation from graph signals (not manual selection)
CREATE OR REPLACE FUNCTION public.compute_user_state(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expertise_count INT := 0;
  v_trust_count INT := 0;
  v_revenue_count INT := 0;
  v_ownership_count INT := 0;
  v_has_cold_start BOOLEAN := false;
  v_state TEXT := 'Explorer';
  v_flow TEXT := 'discover_expertise';
BEGIN
  SELECT COUNT(*) INTO v_expertise_count FROM public.expertise_graph
    WHERE user_id = _user_id AND COALESCE((metadata->>'estimated')::boolean, false) = false;
  SELECT COUNT(*) INTO v_trust_count FROM public.trust_graph WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_revenue_count FROM public.revenue_graph WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_ownership_count FROM public.ownership_graph WHERE user_id = _user_id;
  SELECT EXISTS(SELECT 1 FROM public.cold_start_profiles WHERE user_id = _user_id) INTO v_has_cold_start;

  IF v_ownership_count > 0 THEN v_state := 'Venture Creator'; v_flow := 'scale_venture';
  ELSIF v_revenue_count >= 5 THEN v_state := 'Professional Operator'; v_flow := 'monetize';
  ELSIF v_revenue_count >= 1 THEN v_state := 'Co-Builder'; v_flow := 'engage_startup';
  ELSIF v_trust_count >= 3 THEN v_state := 'Validated Expert'; v_flow := 'find_paid_engagement';
  ELSIF v_expertise_count >= 1 OR v_has_cold_start THEN v_state := 'Builder'; v_flow := 'build_credibility';
  ELSE v_state := 'Explorer'; v_flow := 'discover_expertise';
  END IF;

  RETURN jsonb_build_object(
    'state', v_state,
    'recommended_flow', v_flow,
    'signals', jsonb_build_object(
      'expertise', v_expertise_count, 'trust', v_trust_count,
      'revenue', v_revenue_count, 'ownership', v_ownership_count,
      'has_cold_start', v_has_cold_start
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.compute_user_state(UUID) TO authenticated, service_role;
