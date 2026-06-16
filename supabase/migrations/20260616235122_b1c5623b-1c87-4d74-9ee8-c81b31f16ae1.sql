
CREATE OR REPLACE FUNCTION public.legacy_expertise_calc(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_skills int := 0;
  v_certs int := 0;
  v_verified int := 0;
  v_contribs int := 0;
  v_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_skills   FROM public.user_skills          WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_certs    FROM public.user_certifications  WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_verified FROM public.user_certifications  WHERE user_id = _user_id AND verified = true;
  SELECT COUNT(*) INTO v_contribs FROM public.startup_team_members WHERE member_user_id = _user_id;

  v_score := (v_skills * 1.0) + (v_certs * 3.0) + (v_verified * 2.0) + (v_contribs * 5.0);

  RETURN jsonb_build_object(
    'skills', v_skills,
    'certifications', v_certs,
    'verified', v_verified,
    'contributions', v_contribs,
    'score_partial', v_score
  );
END $$;

GRANT EXECUTE ON FUNCTION public.audit_graph_integrity() TO authenticated;
