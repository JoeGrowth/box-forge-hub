
INSERT INTO public.event_catalog (event_type, event_version, source_module, payload_schema, deprecated)
VALUES
  ('expertise_score_updated','1','reputation','{"required":["user_id","score"]}'::jsonb, false),
  ('trust_score_updated','1','reputation','{"required":["user_id","score"]}'::jsonb, false),
  ('opportunity_completed','1','reputation','{"required":["user_id","opportunity_id"]}'::jsonb, false),
  ('review_received','1','reputation','{"required":["user_id","rating"]}'::jsonb, false),
  ('startup_milestone_completed','1','reputation','{"required":["user_id","milestone_id"]}'::jsonb, false)
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.reputation_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expertise_weight numeric NOT NULL DEFAULT 30,
  trust_weight numeric NOT NULL DEFAULT 30,
  impact_weight numeric NOT NULL DEFAULT 25,
  community_weight numeric NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reputation_weights TO authenticated;
GRANT ALL ON public.reputation_weights TO service_role;
ALTER TABLE public.reputation_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rep_weights_read" ON public.reputation_weights;
DROP POLICY IF EXISTS "rep_weights_admin" ON public.reputation_weights;
CREATE POLICY "rep_weights_read" ON public.reputation_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "rep_weights_admin" ON public.reputation_weights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.reputation_weights (expertise_weight, trust_weight, impact_weight, community_weight, is_active, notes)
SELECT 30, 30, 25, 15, true, 'Phase 5 default weights'
WHERE NOT EXISTS (SELECT 1 FROM public.reputation_weights WHERE is_active = true);

CREATE TABLE IF NOT EXISTS public.reputation_graph (
  user_id uuid PRIMARY KEY,
  reputation_score numeric NOT NULL DEFAULT 0,
  reputation_level text NOT NULL DEFAULT 'verified',
  achievement_count int NOT NULL DEFAULT 0,
  impact_score numeric NOT NULL DEFAULT 0,
  reliability_score numeric NOT NULL DEFAULT 0,
  expertise_score numeric NOT NULL DEFAULT 0,
  trust_score numeric NOT NULL DEFAULT 0,
  revenue_score numeric NOT NULL DEFAULT 0,
  community_score numeric NOT NULL DEFAULT 0,
  reputation_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_event_version bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reputation_graph TO authenticated;
GRANT ALL ON public.reputation_graph TO service_role;
ALTER TABLE public.reputation_graph ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rep_select_all_auth" ON public.reputation_graph;
DROP POLICY IF EXISTS "rep_admin_all" ON public.reputation_graph;
CREATE POLICY "rep_select_all_auth" ON public.reputation_graph FOR SELECT TO authenticated USING (true);
CREATE POLICY "rep_admin_all" ON public.reputation_graph FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recompute_reputation(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_exp numeric; w_tru numeric; w_imp numeric; w_com numeric;
  v_exp numeric := 0; v_tru numeric := 0; v_rev numeric := 0;
  v_verified int := 0; v_contribs int := 0; v_completed int := 0; v_buyers int := 0;
  v_review_count int := 0; v_review_avg numeric := 0;
  v_achievements int := 0;
  v_user_node uuid;
  v_impact_norm numeric; v_community numeric;
  v_score numeric; v_level text; v_max_version bigint; v_breakdown jsonb;
BEGIN
  SELECT expertise_weight, trust_weight, impact_weight, community_weight
    INTO w_exp, w_tru, w_imp, w_com
    FROM public.reputation_weights WHERE is_active = true LIMIT 1;
  IF w_exp IS NULL THEN w_exp:=30; w_tru:=30; w_imp:=25; w_com:=15; END IF;

  SELECT COALESCE(expertise_score,0), COALESCE(verified_expertise_count,0),
         COALESCE((monetizable_expertise->>'contributions')::int, 0)
    INTO v_exp, v_verified, v_contribs
    FROM public.expertise_graph WHERE user_id = _user_id;
  v_exp := COALESCE(v_exp,0); v_verified := COALESCE(v_verified,0); v_contribs := COALESCE(v_contribs,0);

  SELECT COALESCE(trust_score,0) INTO v_tru FROM public.trust_graph WHERE user_id = _user_id;
  v_tru := COALESCE(v_tru,0);

  SELECT COALESCE(total_revenue,0), COALESCE(completed_value_count,0), COALESCE(buyer_count,0)
    INTO v_rev, v_completed, v_buyers
    FROM public.revenue_graph WHERE user_id = _user_id;
  v_rev := COALESCE(v_rev,0); v_completed := COALESCE(v_completed,0); v_buyers := COALESCE(v_buyers,0);

  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT COUNT(*), COALESCE(AVG((e.attributes->>'rating')::numeric), 0)
    INTO v_review_count, v_review_avg
    FROM public.graph_edges e
   WHERE e.from_node_id = v_user_node AND e.edge_type = 'USER_RECEIVED_REVIEW';
  v_review_count := COALESCE(v_review_count,0); v_review_avg := COALESCE(v_review_avg,0);

  v_achievements := v_verified + v_contribs + v_completed;

  v_impact_norm := LEAST(100, (v_rev / 50000.0) * 100);
  v_community   := LEAST(100, (v_review_avg / 5.0) * 100);

  v_score :=
      (LEAST(100, v_exp / 50.0 * 100) * w_exp / 100.0)
    + (LEAST(100, v_tru / 60.0 * 100) * w_tru / 100.0)
    + (v_impact_norm * w_imp / 100.0)
    + (v_community   * w_com / 100.0);

  v_level := CASE
    WHEN v_score >= 80 AND v_verified >= 5 THEN 'authority'
    WHEN v_score >= 60 AND v_verified >= 3 THEN 'expert'
    WHEN v_score >= 40 THEN 'recognized'
    WHEN v_score >= 20 THEN 'established'
    ELSE 'verified'
  END;

  v_breakdown := jsonb_build_object(
    'expertise', jsonb_build_object(
      'points',  round((LEAST(100, v_exp / 50.0 * 100) * w_exp / 100.0)::numeric, 2),
      'reason',  v_verified || ' verified credentials (expertise=' || round(v_exp,1) || ')'),
    'trust',     jsonb_build_object(
      'points',  round(((LEAST(100, v_tru / 60.0 * 100)) * w_tru / 100.0)::numeric, 2),
      'reason',  v_completed || ' completed engagements (trust=' || round(v_tru,1) || ')'),
    'impact',    jsonb_build_object(
      'points',  round((v_impact_norm * w_imp / 100.0)::numeric, 2),
      'reason',  round(v_rev)::text || ' EUR value created across ' || v_buyers || ' organizations'),
    'community', jsonb_build_object(
      'points',  round((v_community * w_com / 100.0)::numeric, 2),
      'reason',  v_review_count || ' validated reviews (avg ' || round(v_review_avg,2) || ')'),
    'weights',   jsonb_build_object('expertise', w_exp, 'trust', w_tru, 'impact', w_imp, 'community', w_com)
  );

  SELECT COALESCE(MAX(version),0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;
  v_max_version := COALESCE(v_max_version,0);

  INSERT INTO public.reputation_graph (
    user_id, reputation_score, reputation_level, achievement_count,
    impact_score, reliability_score, expertise_score, trust_score,
    revenue_score, community_score, reputation_breakdown,
    source_event_version, computed_at
  ) VALUES (
    _user_id, v_score, v_level, v_achievements,
    v_impact_norm, v_tru, v_exp, v_tru,
    v_rev, v_community, v_breakdown,
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    reputation_score=EXCLUDED.reputation_score,
    reputation_level=EXCLUDED.reputation_level,
    achievement_count=EXCLUDED.achievement_count,
    impact_score=EXCLUDED.impact_score,
    reliability_score=EXCLUDED.reliability_score,
    expertise_score=EXCLUDED.expertise_score,
    trust_score=EXCLUDED.trust_score,
    revenue_score=EXCLUDED.revenue_score,
    community_score=EXCLUDED.community_score,
    reputation_breakdown=EXCLUDED.reputation_breakdown,
    source_event_version=EXCLUDED.source_event_version,
    computed_at=EXCLUDED.computed_at;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM public.expertise_graph
    UNION SELECT DISTINCT user_id FROM public.trust_graph
    UNION SELECT DISTINCT user_id FROM public.revenue_graph
  LOOP
    PERFORM public.recompute_reputation(r.user_id);
  END LOOP;
END $$;
