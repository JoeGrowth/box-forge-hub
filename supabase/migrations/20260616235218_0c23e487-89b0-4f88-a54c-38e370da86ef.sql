
CREATE OR REPLACE FUNCTION public.recompute_expertise(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_node uuid;
  v_skill_count int := 0;
  v_cert_count int := 0;
  v_verified_count int := 0;
  v_contrib_count int := 0;
  v_delivered_count int := 0;
  v_engaged_count int := 0;
  v_tags text[];
  v_score numeric;
  v_level text;
  v_max_version bigint;
  v_breakdown jsonb;
  v_w_skill numeric := 1.0;
  v_w_cert  numeric := 3.0;
  v_w_verif numeric := 2.0;
  v_w_contrib numeric := 5.0;
  v_w_deliv  numeric := 4.0;
  v_w_engag  numeric := 3.0;
BEGIN
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT COUNT(*) INTO v_skill_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_SKILL';
  SELECT COUNT(*) INTO v_cert_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_CERTIFICATION';
  SELECT COUNT(*) INTO v_verified_count
    FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node AND e.edge_type = 'HAS_CERTIFICATION'
      AND COALESCE((e.attributes->>'verified')::boolean, false) = true;

  -- Canonical "contribution" = distinct startups the user is on. Counts via
  -- MEMBER_OF ∪ CONTRIBUTED_TO so backfill (MEMBER_OF only) and live emits
  -- (both) produce the same number.
  SELECT COUNT(DISTINCT e.to_node_id) INTO v_contrib_count
    FROM public.graph_edges e
    WHERE e.from_node_id = v_user_node
      AND e.edge_type IN ('MEMBER_OF','CONTRIBUTED_TO');

  SELECT COUNT(*) INTO v_delivered_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'DELIVERED';
  SELECT COUNT(*) INTO v_engaged_count
    FROM public.graph_edges e WHERE e.from_node_id = v_user_node AND e.edge_type = 'ENGAGED_IN';

  SELECT COALESCE(array_agg(DISTINCT n.label) FILTER (WHERE n.label IS NOT NULL), '{}')
    INTO v_tags
    FROM public.graph_edges e
    JOIN public.graph_nodes n ON n.id = e.to_node_id
    WHERE e.from_node_id = v_user_node
      AND e.edge_type IN ('HAS_SKILL','HAS_CERTIFICATION');

  v_breakdown := jsonb_build_object(
    'skills',                  jsonb_build_object('count', v_skill_count,     'weight', v_w_skill,  'points', v_skill_count    * v_w_skill),
    'certifications',          jsonb_build_object('count', v_cert_count,      'weight', v_w_cert,   'points', v_cert_count     * v_w_cert),
    'verified_certifications', jsonb_build_object('count', v_verified_count,  'weight', v_w_verif,  'points', v_verified_count * v_w_verif),
    'startup_contributions',   jsonb_build_object('count', v_contrib_count,   'weight', v_w_contrib,'points', v_contrib_count  * v_w_contrib),
    'trainings_delivered',     jsonb_build_object('count', v_delivered_count, 'weight', v_w_deliv,  'points', v_delivered_count* v_w_deliv),
    'consulting_engagements',  jsonb_build_object('count', v_engaged_count,   'weight', v_w_engag,  'points', v_engaged_count  * v_w_engag)
  );

  v_score :=
      (v_skill_count    * v_w_skill)
    + (v_cert_count     * v_w_cert)
    + (v_verified_count * v_w_verif)
    + (v_contrib_count  * v_w_contrib)
    + (v_delivered_count* v_w_deliv)
    + (v_engaged_count  * v_w_engag);

  v_level := CASE
    WHEN v_score >= 50 THEN 'expert'
    WHEN v_score >= 20 THEN 'advanced'
    WHEN v_score >= 8  THEN 'intermediate'
    WHEN v_score >  0  THEN 'emerging'
    ELSE 'novice'
  END;

  SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.expertise_graph (
    user_id, expertise_score, expertise_tags, expertise_level,
    verified_expertise_count, monetizable_expertise, score_breakdown,
    source_event_version, computed_at
  ) VALUES (
    _user_id, v_score, v_tags, v_level, v_verified_count,
    jsonb_build_object(
      'skills', v_skill_count,
      'certifications', v_cert_count,
      'contributions', v_contrib_count,
      'trainings_delivered', v_delivered_count,
      'consulting_engagements', v_engaged_count
    ),
    v_breakdown,
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    expertise_score = EXCLUDED.expertise_score,
    expertise_tags = EXCLUDED.expertise_tags,
    expertise_level = EXCLUDED.expertise_level,
    verified_expertise_count = EXCLUDED.verified_expertise_count,
    monetizable_expertise = EXCLUDED.monetizable_expertise,
    score_breakdown = EXCLUDED.score_breakdown,
    source_event_version = EXCLUDED.source_event_version,
    computed_at = EXCLUDED.computed_at;
END $$;

-- Recompute all existing projections with the corrected logic.
DO $$
DECLARE u uuid;
BEGIN
  FOR u IN SELECT user_id FROM public.expertise_graph LOOP
    PERFORM public.recompute_expertise(u);
  END LOOP;
END $$;
