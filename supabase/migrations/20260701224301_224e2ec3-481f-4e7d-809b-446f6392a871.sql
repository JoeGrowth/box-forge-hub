
-- Reflect verified affiliations in the "Impact" reputation tile.
-- Previously the tile only counted revenue-buyer organizations. Accepting a
-- role link produces a verified affiliation but no revenue, so the tile stayed
-- "0 organizations" even after a link was accepted. Now the organization count
-- surfaces the union of revenue buyers and distinct verified affiliations.

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
  v_affiliated_orgs int := 0; v_total_orgs int := 0;
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

  SELECT COUNT(DISTINCT (entity_type, entity_id))
    INTO v_affiliated_orgs
    FROM public.verified_affiliations
   WHERE profile_id = _user_id AND active = true;
  v_affiliated_orgs := COALESCE(v_affiliated_orgs, 0);

  v_total_orgs := GREATEST(v_buyers, v_affiliated_orgs);

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
      'reason',  round(v_rev)::text || ' EUR value created across ' || v_total_orgs || ' organization' || CASE WHEN v_total_orgs = 1 THEN '' ELSE 's' END),
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
END;
$$;

-- Recompute reputation whenever a verified affiliation is created or
-- deactivated so the "Impact" tile stays in sync with role acceptance.
CREATE OR REPLACE FUNCTION public.trg_recompute_reputation_on_affiliation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_reputation(OLD.profile_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_reputation(NEW.profile_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verified_affiliations_recompute_reputation ON public.verified_affiliations;
CREATE TRIGGER verified_affiliations_recompute_reputation
AFTER INSERT OR UPDATE OR DELETE ON public.verified_affiliations
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_reputation_on_affiliation();

-- Backfill: recompute for every profile that already has a verified affiliation
-- so existing acceptances (e.g. Youssef Ben Younes) immediately reflect the fix.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT profile_id FROM public.verified_affiliations WHERE active = true LOOP
    PERFORM public.recompute_reputation(r.profile_id);
  END LOOP;
END $$;
