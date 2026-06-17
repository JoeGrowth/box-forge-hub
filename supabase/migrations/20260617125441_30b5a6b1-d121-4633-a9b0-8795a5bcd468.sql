
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
    SELECT role, SUM(weight) AS raw_score, jsonb_agg(edge_id) AS evidence_edges
      FROM evidence
     WHERE role IS NOT NULL
     GROUP BY role
  LOOP
    INSERT INTO public.role_affinity_projection
      (user_id, role, score, evidence_edges, computed_at, source_event_version)
    VALUES
      (_user_id, r.role,
       -- clamp to [0,1]; weak prior added inside clamp so it can never push score above 1.
       LEAST(1.0, GREATEST(0.0,
         (1.0 - exp(-r.raw_score)) + v_prior_weight
       )),
       r.evidence_edges, now(), v_max_version);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $fn$;
