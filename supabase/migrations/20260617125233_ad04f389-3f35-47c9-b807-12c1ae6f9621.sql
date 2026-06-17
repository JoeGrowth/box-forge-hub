
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'practice_verified';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'training_verified';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'consulting_verified';

COMMIT;

INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema)
VALUES
  ('practice_verified',   1, 'experience', 'User practice layer validated by admin/system',   '{"type":"object"}'::jsonb),
  ('training_verified',   1, 'experience', 'User training layer validated by admin/system',   '{"type":"object"}'::jsonb),
  ('consulting_verified', 1, 'experience', 'User consulting layer validated by admin/system', '{"type":"object"}'::jsonb)
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_experience_validation(
  _user_id uuid,
  _edge_type public.graph_edge_type,
  _aggregate_external_id text,
  _aggregate_label text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user_node uuid; v_exp_node uuid; v_skill_count int; v_new_skill_count int;
BEGIN
  IF _edge_type NOT IN ('USER_PRACTICE_EXPERIENCE','USER_TRAINING_EXPERIENCE','USER_CONSULTING_EXPERIENCE') THEN
    RAISE EXCEPTION 'invalid experience edge_type: %', _edge_type;
  END IF;

  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT COUNT(*) INTO v_skill_count FROM public.graph_nodes WHERE node_type='skill';

  v_exp_node := public.graph_upsert_node(
    'certification'::graph_node_type,
    'exp:' || _edge_type::text || ':' || _aggregate_external_id,
    _aggregate_label,
    jsonb_build_object('experience_layer', _edge_type::text)
  );

  INSERT INTO public.graph_edges (from_node_id, to_node_id, edge_type, weight, attributes, occurred_at, validated, confidence)
  VALUES (v_user_node, v_exp_node, _edge_type, 1.0,
          jsonb_build_object('validated_at', now()), now(), true, 1.0)
  ON CONFLICT (from_node_id, to_node_id, edge_type)
  DO UPDATE SET validated = true,
                confidence = LEAST(COALESCE(graph_edges.confidence,0) + 0.2, 1.0),
                attributes = graph_edges.attributes || EXCLUDED.attributes;

  UPDATE public.graph_edges
     SET validated = true,
         confidence = LEAST(COALESCE(confidence, 0) + 0.2, 1.0)
   WHERE from_node_id = v_user_node AND edge_type = 'HAS_SKILL';

  SELECT COUNT(*) INTO v_new_skill_count FROM public.graph_nodes WHERE node_type='skill';
  IF v_new_skill_count <> v_skill_count THEN
    RAISE EXCEPTION 'invariant violated: experience validation created skill nodes (% -> %)', v_skill_count, v_new_skill_count;
  END IF;
END $fn$;

GRANT EXECUTE ON FUNCTION public.apply_experience_validation(uuid, public.graph_edge_type, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.recompute_expertise_confidence(_user_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user_node uuid; v_skill_count int := 0; v_base_completeness numeric := 0;
  v_layers int := 0; v_multiplier numeric; v_confidence numeric; v_unlocked boolean;
BEGIN
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT COUNT(*) INTO v_skill_count
    FROM public.graph_edges
   WHERE from_node_id = v_user_node AND edge_type = 'HAS_SKILL';

  v_base_completeness := LEAST(1.0, v_skill_count::numeric / 5.0);

  SELECT COUNT(DISTINCT edge_type) INTO v_layers
    FROM public.graph_edges
   WHERE from_node_id = v_user_node
     AND edge_type IN ('USER_PRACTICE_EXPERIENCE','USER_TRAINING_EXPERIENCE','USER_CONSULTING_EXPERIENCE')
     AND validated = true;

  v_multiplier := LEAST(1.6, 1.0 + (0.15 * v_layers));
  v_confidence := LEAST(1.6, v_base_completeness * v_multiplier);

  v_unlocked := public.can_access_entrepreneurial_layer(_user_id);

  INSERT INTO public.expertise_graph (user_id, confidence, score_breakdown, computed_at)
  VALUES (_user_id, v_confidence,
          jsonb_build_object(
            'base_completeness', v_base_completeness,
            'validation_multiplier', v_multiplier,
            'validated_experience_layers', v_layers,
            'entrepreneurial_unlocked', v_unlocked
          ), now())
  ON CONFLICT (user_id) DO UPDATE
    SET confidence = GREATEST(COALESCE(expertise_graph.confidence,0), EXCLUDED.confidence),
        score_breakdown = COALESCE(expertise_graph.score_breakdown,'{}'::jsonb)
                        || jsonb_build_object(
                             'base_completeness', v_base_completeness,
                             'validation_multiplier', v_multiplier,
                             'validated_experience_layers', v_layers,
                             'entrepreneurial_unlocked', v_unlocked
                           ),
        computed_at = now();

  RETURN v_confidence;
END $fn$;

GRANT EXECUTE ON FUNCTION public.recompute_expertise_confidence(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.recompute_role_affinity(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user_node uuid; v_prior_weight numeric := 0; v_max_version bigint; v_count int := 0; r record;
BEGIN
  v_user_node := public.graph_upsert_node('user'::graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  SELECT LEAST(0.1, COALESCE(weak_prior_weight, 0.1))
    INTO v_prior_weight
    FROM public.natural_roles
   WHERE user_id = _user_id AND COALESCE(is_self_declared, false) = true
   LIMIT 1;
  v_prior_weight := COALESCE(v_prior_weight, 0);

  SELECT COALESCE(MAX(version),0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  DELETE FROM public.role_affinity_projection WHERE user_id = _user_id;

  FOR r IN
    WITH evidence AS (
      SELECT
        CASE
          WHEN e.edge_type = 'USER_PRACTICE_EXPERIENCE'   THEN 'builder'::role_affinity_kind
          WHEN e.edge_type = 'USER_TRAINING_EXPERIENCE'   THEN 'strategist'::role_affinity_kind
          WHEN e.edge_type = 'USER_CONSULTING_EXPERIENCE' THEN 'operator'::role_affinity_kind
          WHEN e.edge_type IN ('CONTRIBUTED_TO','MEMBER_OF') THEN 'connector'::role_affinity_kind
        END AS role,
        e.id AS edge_id,
        COALESCE(e.confidence, 0.5) AS weight
      FROM public.graph_edges e
      WHERE e.from_node_id = v_user_node
        AND COALESCE(e.validated, false) = true
    )
    SELECT role, SUM(weight) AS score, jsonb_agg(edge_id) AS evidence_edges
      FROM evidence
     WHERE role IS NOT NULL
     GROUP BY role
  LOOP
    INSERT INTO public.role_affinity_projection
      (user_id, role, score, evidence_edges, computed_at, source_event_version)
    VALUES
      (_user_id, r.role, r.score + v_prior_weight, r.evidence_edges, now(), v_max_version);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $fn$;

GRANT EXECUTE ON FUNCTION public.recompute_role_affinity(uuid) TO service_role;
