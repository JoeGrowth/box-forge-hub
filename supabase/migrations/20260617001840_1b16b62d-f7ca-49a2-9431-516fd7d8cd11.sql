
CREATE OR REPLACE FUNCTION public.recompute_opportunity_matches(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  w_exp numeric; w_tru numeric; w_xp numeric; w_int numeric; w_fr numeric;
  v_user_tags text[]; v_trust numeric := 0; v_verified int := 0; v_contribs int := 0;
  v_max_version bigint; v_count int := 0;
BEGIN
  SELECT expertise_weight, trust_weight, experience_weight, intent_weight, freshness_weight
    INTO w_exp, w_tru, w_xp, w_int, w_fr
    FROM public.opportunity_weights WHERE is_active = true LIMIT 1;
  IF w_exp IS NULL THEN w_exp:=50; w_tru:=20; w_xp:=15; w_int:=10; w_fr:=5; END IF;

  SELECT COALESCE(expertise_tags,'{}')::text[] INTO v_user_tags
    FROM public.expertise_graph WHERE user_id = _user_id;
  IF v_user_tags IS NULL THEN v_user_tags := '{}'; END IF;

  SELECT COALESCE(eg.verified_expertise_count,0),
         COALESCE((eg.monetizable_expertise->>'contributions')::int, 0),
         COALESCE(tg.trust_score, 0)
    INTO v_verified, v_contribs, v_trust
    FROM public.expertise_graph eg
    LEFT JOIN public.trust_graph tg ON tg.user_id = eg.user_id
    WHERE eg.user_id = _user_id;

  SELECT COALESCE(MAX(version),0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  DELETE FROM public.opportunity_graph WHERE user_id = _user_id;

  WITH opps AS (
    SELECT id::text AS opp_id, 'job'::text AS kind, title, COALESCE(sector,'') AS sector,
           COALESCE(requirements,'') AS body, created_at
      FROM public.job_opportunities
     WHERE COALESCE(status,'open') NOT IN ('closed','archived')
    UNION ALL
    SELECT id::text, 'training', title, COALESCE(sector,''),
           COALESCE(description,'')||' '||COALESCE(target_audience,''), created_at
      FROM public.training_opportunities
     WHERE COALESCE(review_status,'approved') = 'approved'
    UNION ALL
    SELECT id::text, 'consulting', COALESCE(title,client_name),
           COALESCE(consulting_firm,''), COALESCE(description,''), created_at
      FROM public.consultant_opportunities
     WHERE COALESCE(is_completed,false) = false
    UNION ALL
    SELECT id::text, 'tender', title, COALESCE(sector,''),
           COALESCE(requirements,''), created_at
      FROM public.tenders
     WHERE COALESCE(status,'open') NOT IN ('closed','archived')
    UNION ALL
    SELECT id::text, 'startup', title, COALESCE(sector,''),
           COALESCE(description,'')||' '||COALESCE(array_to_string(roles_needed,' '),''), created_at
      FROM public.startup_ideas
     WHERE COALESCE(is_looking_for_cobuilders,false) = true
       AND COALESCE(review_status,'approved') = 'approved'
       AND COALESCE(creator_id,'00000000-0000-0000-0000-000000000000'::uuid) <> _user_id
  ),
  scored AS (
    SELECT o.opp_id, o.kind, o.title, o.created_at,
      (SELECT COALESCE(array_agg(t),'{}') FROM unnest(v_user_tags) t
        WHERE position(lower(t) in lower(o.title||' '||o.sector||' '||o.body)) > 0) AS matched_tags
    FROM opps o
  ),
  computed AS (
    SELECT s.*, COALESCE(array_length(s.matched_tags,1),0) AS match_count,
      GREATEST(0, 30 - EXTRACT(EPOCH FROM (now() - s.created_at))/86400)::numeric AS freshness_days
    FROM scored s
  ),
  pointed AS (
    SELECT c.*,
      LEAST(1.0, c.match_count::numeric / 5.0) * w_exp AS p_exp,
      LEAST(1.0, v_trust / 60.0) * w_tru AS p_tru,
      LEAST(1.0, (v_verified + v_contribs)::numeric / 3.0) * w_xp AS p_xp,
      (c.freshness_days / 30.0) * w_fr AS p_fr
    FROM computed c
  )
  INSERT INTO public.opportunity_graph (
    user_id, opportunity_id, opportunity_kind,
    expertise_points, trust_points, experience_points,
    intent_points, freshness_points, match_score, confidence_score,
    explanation, next_action, source_event_version, computed_at)
  SELECT _user_id, p.opp_id, p.kind,
    p.p_exp, p.p_tru, p.p_xp, 0, p.p_fr,
    p.p_exp + p.p_tru + p.p_xp + p.p_fr,
    LEAST(1.0,
      (CASE WHEN array_length(v_user_tags,1) IS NULL THEN 0 ELSE 0.4 END)
      + (CASE WHEN v_trust > 0 THEN 0.3 ELSE 0 END)
      + (CASE WHEN v_verified + v_contribs > 0 THEN 0.3 ELSE 0 END)),
    jsonb_build_object(
      'skills_match', jsonb_build_object('points', p.p_exp, 'matched', COALESCE(to_jsonb(p.matched_tags),'[]'::jsonb)),
      'trust',        jsonb_build_object('points', p.p_tru, 'reason', v_verified||' verified achievements (trust='||round(v_trust,1)||')'),
      'experience',   jsonb_build_object('points', p.p_xp,  'reason', v_contribs||' startup contributions'),
      'intent',       jsonb_build_object('points', 0,       'reason', 'no recorded interactions yet'),
      'freshness',    jsonb_build_object('points', p.p_fr,  'reason', 'posted '||round(EXTRACT(EPOCH FROM (now()-p.created_at))/86400)::int||' days ago'),
      'weights',      jsonb_build_object('expertise', w_exp,'trust', w_tru,'experience', w_xp,'intent', w_int,'freshness', w_fr)),
    CASE p.kind
      WHEN 'job' THEN 'Apply to job'
      WHEN 'training' THEN 'Enrol in training'
      WHEN 'consulting' THEN 'Propose consulting'
      WHEN 'tender' THEN 'Bid on tender'
      WHEN 'startup' THEN 'Join startup'
      ELSE 'View opportunity' END,
    v_max_version, now()
  FROM pointed p
  WHERE p.p_exp + p.p_tru + p.p_xp + p.p_fr > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $fn$;
REVOKE EXECUTE ON FUNCTION public.recompute_opportunity_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_opportunity_matches(uuid) TO authenticated, service_role;
