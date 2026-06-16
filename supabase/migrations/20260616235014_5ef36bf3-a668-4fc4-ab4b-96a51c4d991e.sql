
-- ============================================================
-- 1. graph_events.attempt_count (worker increments)
-- ============================================================
ALTER TABLE public.graph_events
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

-- ============================================================
-- 2. DEAD LETTER QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.graph_dead_letters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.graph_events(id) ON DELETE CASCADE,
  event_type       public.graph_event_type NOT NULL,
  user_id          uuid NOT NULL,
  error            text NOT NULL,
  attempt_count    integer NOT NULL,
  payload_snapshot jsonb NOT NULL,
  failed_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_graph_dead_letters_unresolved
  ON public.graph_dead_letters(failed_at) WHERE resolved_at IS NULL;

GRANT SELECT ON public.graph_dead_letters TO authenticated;
GRANT ALL ON public.graph_dead_letters TO service_role;

ALTER TABLE public.graph_dead_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read dead letters"
  ON public.graph_dead_letters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. INTEGRITY AUDIT RPC (structural, not score-based)
--    Returns one row per (user, signal) mismatch. Zero rows = pass.
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_graph_integrity()
RETURNS TABLE (
  user_id        uuid,
  signal         text,
  source_count   bigint,
  graph_count    bigint,
  delta          bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH users AS (
    SELECT DISTINCT p.user_id FROM public.profiles p
  ),
  src_skills AS (
    SELECT u.user_id, COUNT(s.skill_tag_id) AS c
    FROM users u LEFT JOIN public.user_skills s ON s.user_id = u.user_id
    GROUP BY u.user_id
  ),
  src_certs AS (
    SELECT u.user_id, COUNT(c.id) AS c
    FROM users u LEFT JOIN public.user_certifications c ON c.user_id = u.user_id
    GROUP BY u.user_id
  ),
  src_verified_certs AS (
    SELECT u.user_id, COUNT(c.id) AS c
    FROM users u LEFT JOIN public.user_certifications c
      ON c.user_id = u.user_id AND c.verified = true
    GROUP BY u.user_id
  ),
  src_contribs AS (
    SELECT u.user_id, COUNT(m.id) AS c
    FROM users u LEFT JOIN public.startup_team_members m ON m.member_user_id = u.user_id
    GROUP BY u.user_id
  ),
  g_skills AS (
    SELECT n.external_id::uuid AS user_id, COUNT(*) AS c
    FROM public.graph_nodes n
    JOIN public.graph_edges e ON e.from_node_id = n.id AND e.edge_type = 'HAS_SKILL'
    WHERE n.node_type = 'user'
    GROUP BY n.external_id
  ),
  g_certs AS (
    SELECT n.external_id::uuid AS user_id, COUNT(*) AS c
    FROM public.graph_nodes n
    JOIN public.graph_edges e ON e.from_node_id = n.id AND e.edge_type = 'HAS_CERTIFICATION'
    WHERE n.node_type = 'user'
    GROUP BY n.external_id
  ),
  g_verified AS (
    SELECT n.external_id::uuid AS user_id, COUNT(*) AS c
    FROM public.graph_nodes n
    JOIN public.graph_edges e ON e.from_node_id = n.id AND e.edge_type = 'HAS_CERTIFICATION'
    WHERE n.node_type = 'user'
      AND COALESCE((e.attributes->>'verified')::boolean, false) = true
    GROUP BY n.external_id
  ),
  g_contribs AS (
    SELECT n.external_id::uuid AS user_id, COUNT(*) AS c
    FROM public.graph_nodes n
    JOIN public.graph_edges e ON e.from_node_id = n.id
       AND e.edge_type IN ('MEMBER_OF','CONTRIBUTED_TO')
    WHERE n.node_type = 'user'
    GROUP BY n.external_id
  )
  SELECT u.user_id, 'skills'::text,
         COALESCE(s.c,0), COALESCE(g.c,0), COALESCE(g.c,0) - COALESCE(s.c,0)
    FROM users u LEFT JOIN src_skills s ON s.user_id = u.user_id
                  LEFT JOIN g_skills  g ON g.user_id = u.user_id
   WHERE COALESCE(s.c,0) <> COALESCE(g.c,0)
  UNION ALL
  SELECT u.user_id, 'certifications',
         COALESCE(s.c,0), COALESCE(g.c,0), COALESCE(g.c,0) - COALESCE(s.c,0)
    FROM users u LEFT JOIN src_certs s ON s.user_id = u.user_id
                  LEFT JOIN g_certs  g ON g.user_id = u.user_id
   WHERE COALESCE(s.c,0) <> COALESCE(g.c,0)
  UNION ALL
  SELECT u.user_id, 'verified_certifications',
         COALESCE(s.c,0), COALESCE(g.c,0), COALESCE(g.c,0) - COALESCE(s.c,0)
    FROM users u LEFT JOIN src_verified_certs s ON s.user_id = u.user_id
                  LEFT JOIN g_verified         g ON g.user_id = u.user_id
   WHERE COALESCE(s.c,0) <> COALESCE(g.c,0)
  UNION ALL
  SELECT u.user_id, 'startup_contributions',
         COALESCE(s.c,0), COALESCE(g.c,0), COALESCE(g.c,0) - COALESCE(s.c,0)
    FROM users u LEFT JOIN src_contribs s ON s.user_id = u.user_id
                  LEFT JOIN g_contribs  g ON g.user_id = u.user_id
   WHERE COALESCE(s.c,0) <> COALESCE(g.c,0);
$$;

REVOKE ALL ON FUNCTION public.audit_graph_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_graph_integrity() TO service_role;

-- ============================================================
-- 4. BACKFILL — replay-safe, deterministic idempotency keys
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_graph_events_v1()
RETURNS TABLE (
  source        text,
  attempted     bigint,
  newly_emitted bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attempted bigint;
  v_inserted  bigint;
BEGIN
  -- (a) skill_added from user_skills
  WITH src AS (
    SELECT us.user_id, st.id AS skill_id, st.name AS skill_name, us.created_at
      FROM public.user_skills us
      JOIN public.skill_tags st ON st.id = us.skill_tag_id
  ),
  ins AS (
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'skill_added'::graph_event_type, 1, 'skill',
           s.skill_id::text, 'profile.skills',
           'skill_added:v1:' || s.user_id || ':' || s.skill_id,
           jsonb_build_object('skill_id', s.skill_id::text, 'skill_name', s.skill_name),
           1,
           COALESCE(s.created_at, now())
      FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_attempted, v_inserted;
  RETURN QUERY SELECT 'skill_added'::text, v_attempted, v_inserted;

  -- (b) certification_earned + certification_verified from user_certifications
  WITH src AS (
    SELECT uc.user_id, uc.id AS cert_id, uc.certification_type, uc.display_label,
           uc.verified, uc.created_at
      FROM public.user_certifications uc
  ),
  ins_earn AS (
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'certification_earned'::graph_event_type, 1, 'certification',
           s.certification_type, 'learning.journey',
           'certification_earned:v1:' || s.user_id || ':' || s.cert_id,
           jsonb_build_object(
             'certification_type', s.certification_type,
             'certification_label', s.display_label,
             'verified', s.verified
           ),
           1,
           COALESCE(s.created_at, now())
      FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins_earn) INTO v_attempted, v_inserted;
  RETURN QUERY SELECT 'certification_earned'::text, v_attempted, v_inserted;

  WITH src AS (
    SELECT uc.user_id, uc.id AS cert_id, uc.certification_type, uc.display_label, uc.created_at
      FROM public.user_certifications uc
     WHERE uc.verified = true
  ),
  ins_ver AS (
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'certification_verified'::graph_event_type, 1, 'certification',
           s.certification_type, 'admin.approvals',
           'certification_verified:v1:' || s.user_id || ':' || s.cert_id,
           jsonb_build_object(
             'certification_type', s.certification_type,
             'certification_label', s.display_label
           ),
           1,
           COALESCE(s.created_at, now())
      FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins_ver) INTO v_attempted, v_inserted;
  RETURN QUERY SELECT 'certification_verified'::text, v_attempted, v_inserted;

  -- (c) startup_member_added from startup_team_members
  WITH src AS (
    SELECT m.member_user_id AS user_id, m.startup_id, m.added_at
      FROM public.startup_team_members m
  ),
  ins AS (
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'startup_member_added'::graph_event_type, 1, 'startup',
           s.startup_id::text, 'idea.team',
           'startup_member_added:v1:' || s.user_id || ':' || s.startup_id,
           jsonb_build_object('startup_id', s.startup_id::text),
           1,
           COALESCE(s.added_at, now())
      FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_attempted, v_inserted;
  RETURN QUERY SELECT 'startup_member_added'::text, v_attempted, v_inserted;

  -- (d) startup_contribution_accepted from startup_applications(status='accepted')
  WITH src AS (
    SELECT a.applicant_id AS user_id, a.id AS application_id,
           a.startup_id, a.role_applied, a.created_at
      FROM public.startup_applications a
     WHERE a.status = 'accepted'
  ),
  ins AS (
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'startup_contribution_accepted'::graph_event_type, 1, 'startup',
           s.startup_id::text, 'idea.team',
           'startup_contribution_accepted:v1:' || s.user_id || ':' || s.application_id,
           jsonb_build_object(
             'startup_id', s.startup_id::text,
             'role', s.role_applied,
             'application_id', s.application_id::text
           ),
           1,
           COALESCE(s.created_at, now())
      FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_attempted, v_inserted;
  RETURN QUERY SELECT 'startup_contribution_accepted'::text, v_attempted, v_inserted;
END $$;

REVOKE ALL ON FUNCTION public.backfill_graph_events_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_graph_events_v1() TO service_role;

-- ============================================================
-- 5. EXECUTE BACKFILL (idempotent — safe to re-run via migration replay)
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM public.backfill_graph_events_v1() LOOP
    RAISE NOTICE 'backfill % attempted=% emitted=%', r.source, r.attempted, r.newly_emitted;
  END LOOP;
END $$;
