
CREATE OR REPLACE FUNCTION public.promote_profile_draft(
  _title text DEFAULT NULL,
  _summary text DEFAULT NULL,
  _skills text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles p
  SET
    professional_title = COALESCE(_title,   p.draft_title,   p.professional_title),
    summary_statement  = COALESCE(_summary, p.draft_summary, p.summary_statement),
    primary_skills     = COALESCE(
                           array_to_string(_skills, ', '),
                           array_to_string(p.draft_skills, ', '),
                           p.primary_skills
                         ),
    profile_draft_accepted_at = now()
  WHERE p.user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_draft(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_draft(text, text, text[]) TO authenticated;
