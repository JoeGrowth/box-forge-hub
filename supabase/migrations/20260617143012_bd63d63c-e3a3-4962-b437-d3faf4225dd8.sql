
-- ================================================================
-- Lifecycle Integrity & Consistency Validator
-- ================================================================
-- Audits opportunity_lifecycle_graph against:
--   1) Transition validity      — no impossible jumps
--   2) Multi-source consistency — projection vs applications / startup_applications
--   3) Time coherence           — per-stage timestamps strictly ordered
--   4) Category parity          — every row uses a known category
--
-- Findings are persisted so the same scan can be compared across runs.
-- Admin-only — this is a system observability surface, not a user feature.

CREATE TABLE IF NOT EXISTS public.lifecycle_integrity_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','error')),
  user_id uuid,
  category text,
  opportunity_id text,
  lifecycle_id uuid,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lifecycle_integrity_findings TO authenticated;
GRANT ALL    ON public.lifecycle_integrity_findings TO service_role;

ALTER TABLE public.lifecycle_integrity_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lif_admin_select"
  ON public.lifecycle_integrity_findings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_lif_run      ON public.lifecycle_integrity_findings(run_id, severity);
CREATE INDEX IF NOT EXISTS idx_lif_check    ON public.lifecycle_integrity_findings(check_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lif_lifecycle ON public.lifecycle_integrity_findings(lifecycle_id);

-- ----------------------------------------------------------------
-- Master validator — admin only. Returns the run_id; findings land
-- in lifecycle_integrity_findings for that run.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_lifecycle_integrity_checks()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run uuid := gen_random_uuid();
  v_known_categories text[] := ARRAY['job','startup','tender','consulting','training'];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  -- ============================================================
  -- Check 1: Category parity — unknown category in projection
  -- ============================================================
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'category_parity', 'error',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'Lifecycle row uses unknown category: ' || olg.category,
    jsonb_build_object('known_categories', v_known_categories)
  FROM public.opportunity_lifecycle_graph olg
  WHERE NOT (olg.category = ANY (v_known_categories));

  -- ============================================================
  -- Check 2: Transition validity — state present without earlier
  -- required predecessor evidence. Examples of impossible jumps:
  --   * state = 'reviewing'/'shortlisted'/'accepted'/'completed'
  --     but no applied_at
  --   * state = 'shortlisted' but no reviewing_at AND no applied_at
  --   * state_rank disagrees with state
  -- ============================================================
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'transition_validity', 'error',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'State ' || olg.state || ' reached without applied_at timestamp',
    jsonb_build_object('state', olg.state, 'applied_at', olg.applied_at)
  FROM public.opportunity_lifecycle_graph olg
  WHERE olg.state IN ('reviewing','shortlisted','accepted','completed')
    AND olg.applied_at IS NULL;

  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'transition_validity', 'warn',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'State ' || olg.state || ' reached without saved_at timestamp',
    jsonb_build_object('state', olg.state)
  FROM public.opportunity_lifecycle_graph olg
  WHERE olg.state IN ('applied','reviewing','shortlisted','accepted','completed')
    AND olg.saved_at IS NULL
    AND olg.applied_at IS NOT NULL
    -- Saved is optional in practice (user can apply directly); demote to warn
    AND false;  -- disabled: applying without saving is allowed

  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'transition_validity', 'error',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'state_rank disagrees with state',
    jsonb_build_object(
      'state', olg.state,
      'state_rank', olg.state_rank,
      'expected_rank', public.opportunity_lifecycle_rank(olg.state)
    )
  FROM public.opportunity_lifecycle_graph olg
  WHERE olg.state_rank <> public.opportunity_lifecycle_rank(olg.state);

  -- Impossible terminal combinations: completed but also rejected/withdrawn
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'transition_validity', 'warn',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'Completed lifecycle also carries a rejected/withdrawn timestamp',
    jsonb_build_object(
      'completed_at', olg.completed_at,
      'rejected_at', olg.rejected_at,
      'withdrawn_at', olg.withdrawn_at
    )
  FROM public.opportunity_lifecycle_graph olg
  WHERE olg.state = 'completed'
    AND (olg.rejected_at IS NOT NULL OR olg.withdrawn_at IS NOT NULL);

  -- ============================================================
  -- Check 3: Time coherence — per-stage timestamps must be monotonic
  -- viewed ≤ saved ≤ applied ≤ reviewing ≤ shortlisted ≤ accepted ≤ completed
  -- ============================================================
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'time_coherence', 'error',
    olg.user_id, olg.category, olg.opportunity_id, olg.id,
    'Timestamps out of order: ' || violation,
    jsonb_build_object(
      'first_viewed_at', olg.first_viewed_at,
      'saved_at', olg.saved_at,
      'applied_at', olg.applied_at,
      'reviewing_at', olg.reviewing_at,
      'shortlisted_at', olg.shortlisted_at,
      'accepted_at', olg.accepted_at,
      'completed_at', olg.completed_at
    )
  FROM public.opportunity_lifecycle_graph olg
  CROSS JOIN LATERAL (
    SELECT string_agg(v, ', ') AS violation
    FROM (
      SELECT 'first_viewed_at > saved_at'   AS v WHERE olg.first_viewed_at IS NOT NULL AND olg.saved_at      IS NOT NULL AND olg.first_viewed_at > olg.saved_at
      UNION ALL SELECT 'saved_at > applied_at'         WHERE olg.saved_at        IS NOT NULL AND olg.applied_at    IS NOT NULL AND olg.saved_at       > olg.applied_at
      UNION ALL SELECT 'applied_at > reviewing_at'     WHERE olg.applied_at      IS NOT NULL AND olg.reviewing_at  IS NOT NULL AND olg.applied_at     > olg.reviewing_at
      UNION ALL SELECT 'reviewing_at > shortlisted_at' WHERE olg.reviewing_at    IS NOT NULL AND olg.shortlisted_at IS NOT NULL AND olg.reviewing_at  > olg.shortlisted_at
      UNION ALL SELECT 'shortlisted_at > accepted_at'  WHERE olg.shortlisted_at  IS NOT NULL AND olg.accepted_at   IS NOT NULL AND olg.shortlisted_at > olg.accepted_at
      UNION ALL SELECT 'accepted_at > completed_at'    WHERE olg.accepted_at     IS NOT NULL AND olg.completed_at  IS NOT NULL AND olg.accepted_at    > olg.completed_at
    ) s
  ) violations
  WHERE violations.violation IS NOT NULL;

  -- ============================================================
  -- Check 4: Multi-source consistency — applications table
  -- For every applications row, the lifecycle projection must
  -- carry an equivalent or later state. Mismatches indicate the
  -- projection trigger missed an event.
  -- ============================================================
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'multi_source_consistency', 'error',
    a.applicant_id, a.opportunity_type::text, a.opportunity_id::text, NULL,
    'applications row has no matching lifecycle projection',
    jsonb_build_object('application_id', a.id, 'status', a.status)
  FROM public.applications a
  LEFT JOIN public.opportunity_lifecycle_graph olg
    ON olg.user_id        = a.applicant_id
   AND olg.category       = a.opportunity_type::text
   AND olg.opportunity_id = a.opportunity_id::text
  WHERE olg.id IS NULL;

  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'multi_source_consistency', 'warn',
    a.applicant_id, a.opportunity_type::text, a.opportunity_id::text, olg.id,
    'Lifecycle state behind applications.status',
    jsonb_build_object(
      'application_status', a.status,
      'lifecycle_state', olg.state,
      'application_rank', public.opportunity_lifecycle_rank(
        CASE a.status::text
          WHEN 'submitted'   THEN 'applied'
          WHEN 'reviewing'   THEN 'reviewing'
          WHEN 'shortlisted' THEN 'shortlisted'
          WHEN 'accepted'    THEN 'accepted'
          WHEN 'completed'   THEN 'completed'
          WHEN 'rejected'    THEN 'rejected'
          WHEN 'withdrawn'   THEN 'withdrawn'
          ELSE 'discovered'
        END),
      'lifecycle_rank', olg.state_rank
    )
  FROM public.applications a
  JOIN public.opportunity_lifecycle_graph olg
    ON olg.user_id        = a.applicant_id
   AND olg.category       = a.opportunity_type::text
   AND olg.opportunity_id = a.opportunity_id::text
  WHERE
    -- Lifecycle must be at least as advanced as the application status
    -- (terminal states ranked equal: applications can be rejected while
    -- projection holds 'applied'; flag as warn)
    olg.state_rank < public.opportunity_lifecycle_rank(
      CASE a.status::text
        WHEN 'submitted'   THEN 'applied'
        WHEN 'reviewing'   THEN 'reviewing'
        WHEN 'shortlisted' THEN 'shortlisted'
        WHEN 'accepted'    THEN 'accepted'
        WHEN 'completed'   THEN 'completed'
        WHEN 'rejected'    THEN 'rejected'
        WHEN 'withdrawn'   THEN 'withdrawn'
        ELSE 'discovered'
      END
    );

  -- Startup applications mirror
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, user_id, category, opportunity_id, lifecycle_id, message, details)
  SELECT
    v_run, 'multi_source_consistency', 'error',
    sa.applicant_id, 'startup', sa.startup_id::text, NULL,
    'startup_applications row has no matching lifecycle projection',
    jsonb_build_object('application_id', sa.id, 'status', sa.status)
  FROM public.startup_applications sa
  LEFT JOIN public.opportunity_lifecycle_graph olg
    ON olg.user_id        = sa.applicant_id
   AND olg.category       = 'startup'
   AND olg.opportunity_id = sa.startup_id::text
  WHERE olg.id IS NULL;

  -- ============================================================
  -- Run summary as a single info finding so the UI can show "OK"
  -- ============================================================
  INSERT INTO public.lifecycle_integrity_findings
    (run_id, check_name, severity, message, details)
  SELECT
    v_run, 'run_summary', 'info',
    'Run complete',
    jsonb_build_object(
      'errors', COUNT(*) FILTER (WHERE severity = 'error'),
      'warnings', COUNT(*) FILTER (WHERE severity = 'warn'),
      'lifecycle_rows', (SELECT COUNT(*) FROM public.opportunity_lifecycle_graph),
      'applications_rows', (SELECT COUNT(*) FROM public.applications),
      'startup_applications_rows', (SELECT COUNT(*) FROM public.startup_applications)
    )
  FROM public.lifecycle_integrity_findings
  WHERE run_id = v_run;

  RETURN v_run;
END $$;

REVOKE EXECUTE ON FUNCTION public.run_lifecycle_integrity_checks() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.run_lifecycle_integrity_checks() TO authenticated;
