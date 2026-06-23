
-- 1. Profile draft columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS draft_title text,
  ADD COLUMN IF NOT EXISTS draft_summary text,
  ADD COLUMN IF NOT EXISTS draft_skills text[],
  ADD COLUMN IF NOT EXISTS profile_draft_source text,
  ADD COLUMN IF NOT EXISTS profile_draft_confidence numeric,
  ADD COLUMN IF NOT EXISTS profile_draft_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_draft_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_draft_dismissed_at timestamptz;

-- 2. Activation funnel timestamps
ALTER TABLE public.onboarding_state
  ADD COLUMN IF NOT EXISTS activation_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_completed_at timestamptz;

-- 3. New enum values (must be in their own statements; safe-ADD with IF NOT EXISTS)
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'activation_hub_viewed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_interested';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'nba_executed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'signal_completed';

-- 4. Promote draft -> profile (preserves provenance)
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
    title   = COALESCE(_title,   p.draft_title,   p.title),
    summary = COALESCE(_summary, p.draft_summary, p.summary),
    skills  = COALESCE(_skills,  p.draft_skills,  p.skills),
    profile_draft_accepted_at = now()
  WHERE p.id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_draft(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_profile_draft(text, text, text[]) TO authenticated;
