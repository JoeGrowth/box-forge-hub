CREATE OR REPLACE FUNCTION public.recompute_advisor_readiness(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nr_complete BOOLEAN := false;
  v_verified_skills INT := 0;
  v_track_record INT := 0;
  v_reputation NUMERIC := 0;
  v_last_activity TIMESTAMPTZ;
  v_eligible BOOLEAN;
  v_reason TEXT;
  v_prev_eligible BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.natural_roles WHERE user_id = _user_id) INTO v_nr_complete;

  SELECT COUNT(*) INTO v_verified_skills FROM public.user_skills WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_track_record FROM public.startup_team_members WHERE member_user_id = _user_id;

  SELECT COALESCE(SUM(reputation_score),0) INTO v_reputation
    FROM public.reputation_graph WHERE user_id = _user_id;

  SELECT MAX(occurred_at) INTO v_last_activity
    FROM public.graph_events WHERE user_id = _user_id;

  IF NOT v_nr_complete THEN v_reason := 'Natural Role assessment incomplete';
  ELSIF v_verified_skills < 3 THEN v_reason := 'Needs at least 3 verified skills (has '||v_verified_skills||')';
  ELSIF v_track_record < 1 THEN v_reason := 'Needs at least 1 track-record entry';
  ELSE v_reason := 'Eligible';
  END IF;

  v_eligible := v_nr_complete AND v_verified_skills >= 3 AND v_track_record >= 1;

  SELECT eligible INTO v_prev_eligible FROM public.advisor_readiness WHERE user_id = _user_id;

  INSERT INTO public.advisor_readiness(
    user_id, eligible, nr_complete, verified_skills, track_record_count,
    reputation_score, last_activity_at, eligibility_reason, computed_at)
  VALUES (_user_id, v_eligible, v_nr_complete, v_verified_skills, v_track_record,
          v_reputation, v_last_activity, v_reason, now())
  ON CONFLICT (user_id) DO UPDATE SET
    eligible = EXCLUDED.eligible,
    nr_complete = EXCLUDED.nr_complete,
    verified_skills = EXCLUDED.verified_skills,
    track_record_count = EXCLUDED.track_record_count,
    reputation_score = EXCLUDED.reputation_score,
    last_activity_at = EXCLUDED.last_activity_at,
    eligibility_reason = EXCLUDED.eligibility_reason,
    computed_at = now();

  IF v_prev_eligible IS DISTINCT FROM v_eligible THEN
    INSERT INTO public.graph_events(user_id, event_type, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
    VALUES (_user_id, 'advisor_eligibility_changed', 'user', _user_id::text, 'advisor_readiness',
            jsonb_build_object('canonical_name','advisor.eligibility.changed','eligible',v_eligible,'reason',v_reason),
            'advisor:'||_user_id||':elig:'||extract(epoch from now())::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
END $function$;