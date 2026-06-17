
-- Event catalog entries
INSERT INTO public.event_catalog (event_type, event_version, source_module, payload_schema, description, deprecated)
VALUES
  ('opportunity_created','1','opportunities','{"type":"object","required":["opportunity_id","opportunity_kind"],"properties":{"opportunity_id":{"type":"string"},"opportunity_kind":{"type":"string"},"title":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"sector":{"type":"string"},"location":{"type":"string"}}}','Opportunity (job/training/consulting/tender/startup) was created.',false),
  ('opportunity_updated','1','opportunities','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"},"changes":{"type":"object"}}}','Opportunity fields were updated.',false),
  ('opportunity_published','1','opportunities','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}','Opportunity transitioned to public listing.',false),
  ('opportunity_closed','1','opportunities','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"},"reason":{"type":"string"}}}','Opportunity was closed / filled / withdrawn.',false),
  ('user_viewed_opportunity','1','opportunities.feed','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}','User viewed an opportunity detail.',false),
  ('user_saved_opportunity','1','opportunities.feed','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}','User bookmarked an opportunity.',false),
  ('user_applied_opportunity','1','opportunities.feed','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"},"opportunity_kind":{"type":"string"}}}','User applied to an opportunity.',false),
  ('user_rejected_opportunity','1','opportunities.feed','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}','User dismissed / hid an opportunity.',false),
  ('user_accepted_opportunity','1','opportunities.feed','{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"}}}','User accepted (or was accepted on) an opportunity.',false)
ON CONFLICT (event_type, event_version) DO NOTHING;

-- Weights config
CREATE TABLE IF NOT EXISTS public.opportunity_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  expertise_weight numeric NOT NULL DEFAULT 50,
  trust_weight numeric NOT NULL DEFAULT 20,
  experience_weight numeric NOT NULL DEFAULT 15,
  intent_weight numeric NOT NULL DEFAULT 10,
  freshness_weight numeric NOT NULL DEFAULT 5,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunity_weights TO anon, authenticated;
GRANT ALL ON public.opportunity_weights TO service_role;
ALTER TABLE public.opportunity_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weights readable by all" ON public.opportunity_weights;
CREATE POLICY "weights readable by all" ON public.opportunity_weights FOR SELECT USING (true);
DROP POLICY IF EXISTS "weights writable by admin" ON public.opportunity_weights;
CREATE POLICY "weights writable by admin" ON public.opportunity_weights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_weights_one_active
  ON public.opportunity_weights (is_active) WHERE is_active = true;
INSERT INTO public.opportunity_weights (is_active, notes)
  SELECT true, 'default v1'
  WHERE NOT EXISTS (SELECT 1 FROM public.opportunity_weights WHERE is_active = true);

-- Projection table
CREATE TABLE IF NOT EXISTS public.opportunity_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  opportunity_id text NOT NULL,
  opportunity_kind text NOT NULL,
  match_score numeric NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  expertise_points numeric NOT NULL DEFAULT 0,
  trust_points numeric NOT NULL DEFAULT 0,
  experience_points numeric NOT NULL DEFAULT 0,
  intent_points numeric NOT NULL DEFAULT 0,
  freshness_points numeric NOT NULL DEFAULT 0,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_action text,
  source_event_version bigint,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);
GRANT SELECT ON public.opportunity_graph TO authenticated;
GRANT ALL ON public.opportunity_graph TO service_role;
ALTER TABLE public.opportunity_graph ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "opportunity_graph self read" ON public.opportunity_graph;
CREATE POLICY "opportunity_graph self read" ON public.opportunity_graph
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS opportunity_graph_user_score_idx
  ON public.opportunity_graph (user_id, match_score DESC);

-- Recompute function
CREATE OR REPLACE FUNCTION public.recompute_opportunity_matches(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  w record;
  v_user_tags text[];
  v_trust numeric := 0;
  v_verified int := 0;
  v_contribs int := 0;
  v_max_version bigint;
  v_count int := 0;
BEGIN
  SELECT * INTO w FROM public.opportunity_weights WHERE is_active = true LIMIT 1;
  IF w IS NULL THEN
    SELECT 50 AS expertise_weight, 20 AS trust_weight, 15 AS experience_weight,
           10 AS intent_weight, 5 AS freshness_weight INTO w;
  END IF;

  SELECT COALESCE(expertise_tags,'{}')::text[]
    INTO v_user_tags FROM public.expertise_graph WHERE user_id = _user_id;
  IF v_user_tags IS NULL THEN v_user_tags := '{}'; END IF;

  SELECT COALESCE(trust_score,0), COALESCE(verified_count,0),
         COALESCE((monetizable_expertise->>'contributions')::int, 0)
    INTO v_trust, v_verified, v_contribs
    FROM public.expertise_graph eg
    LEFT JOIN public.trust_graph tg ON tg.user_id = eg.user_id
    WHERE eg.user_id = _user_id;

  SELECT COALESCE(MAX(version),0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  -- Clear stale matches
  DELETE FROM public.opportunity_graph WHERE user_id = _user_id;

  WITH opps AS (
    SELECT id::text AS opp_id, 'job'::text AS kind, title,
           COALESCE(sector,'') AS sector, COALESCE(requirements,'') AS body,
           created_at, COALESCE(status,'') AS status
      FROM public.job_opportunities
     WHERE COALESCE(status,'open') NOT IN ('closed','archived')
    UNION ALL
    SELECT id::text, 'training', title, COALESCE(category,'') ,
           COALESCE(description,''), created_at, COALESCE(status,'')
      FROM public.training_opportunities
     WHERE COALESCE(status,'open') NOT IN ('closed','archived')
    UNION ALL
    SELECT id::text, 'consulting', COALESCE(title,client_name),
           COALESCE(consulting_firm,''), COALESCE(description,''),
           created_at, CASE WHEN is_completed THEN 'closed' ELSE 'open' END
      FROM public.consultant_opportunities
     WHERE COALESCE(is_completed,false) = false
    UNION ALL
    SELECT id::text, 'tender', title, COALESCE(sector,''),
           COALESCE(requirements,''), created_at, COALESCE(status,'')
      FROM public.tenders
     WHERE COALESCE(status,'open') NOT IN ('closed','archived')
    UNION ALL
    SELECT id::text, 'startup', title, COALESCE(sector,''),
           COALESCE(description,'') || ' ' ||
           COALESCE(array_to_string(roles_needed,' '),''),
           created_at,
           CASE WHEN COALESCE(is_looking_for_cobuilders,false) THEN 'open' ELSE 'closed' END
      FROM public.startup_ideas
     WHERE COALESCE(is_looking_for_cobuilders,false) = true
       AND COALESCE(review_status,'approved') = 'approved'
       AND COALESCE(creator_id, '00000000-0000-0000-0000-000000000000'::uuid) <> _user_id
  ),
  scored AS (
    SELECT o.opp_id, o.kind, o.title, o.created_at, o.sector, o.body,
      (
        SELECT COALESCE(array_agg(t),'{}')
          FROM unnest(v_user_tags) t
         WHERE position(lower(t) in lower(o.title||' '||o.sector||' '||o.body)) > 0
      ) AS matched_tags
    FROM opps o
  ),
  computed AS (
    SELECT s.*,
      array_length(s.matched_tags,1) AS match_count,
      GREATEST(0, 30 - EXTRACT(EPOCH FROM (now() - s.created_at))/86400)::numeric AS freshness_days
    FROM scored s
  )
  INSERT INTO public.opportunity_graph (
    user_id, opportunity_id, opportunity_kind,
    expertise_points, trust_points, experience_points,
    intent_points, freshness_points, match_score, confidence_score,
    explanation, next_action, source_event_version, computed_at
  )
  SELECT
    _user_id,
    c.opp_id,
    c.kind,
    -- Expertise alignment (0..weight). Saturates at ~5 matched tags.
    LEAST(1.0, COALESCE(c.match_count,0)::numeric / 5.0) * w.expertise_weight AS expertise_points,
    -- Trust (0..weight). Saturates at trust_score 60.
    LEAST(1.0, v_trust / 60.0) * w.trust_weight AS trust_points,
    -- Experience (0..weight). Saturates at 3 verified+contribs.
    LEAST(1.0, (v_verified + v_contribs)::numeric / 3.0) * w.experience_weight AS experience_points,
    -- Intent placeholder until interaction events accumulate.
    0 AS intent_points,
    -- Freshness (0..weight) decays over 30 days.
    (c.freshness_days / 30.0) * w.freshness_weight AS freshness_points,
    -- Match score = sum
      LEAST(1.0, COALESCE(c.match_count,0)::numeric / 5.0) * w.expertise_weight
    + LEAST(1.0, v_trust / 60.0) * w.trust_weight
    + LEAST(1.0, (v_verified + v_contribs)::numeric / 3.0) * w.experience_weight
    + (c.freshness_days / 30.0) * w.freshness_weight AS match_score,
    -- Confidence: how much signal we had (0..1)
    LEAST(1.0,
      (CASE WHEN array_length(v_user_tags,1) IS NULL THEN 0 ELSE 0.4 END)
      + (CASE WHEN v_trust > 0 THEN 0.3 ELSE 0 END)
      + (CASE WHEN v_verified + v_contribs > 0 THEN 0.3 ELSE 0 END)
    ) AS confidence_score,
    jsonb_build_object(
      'skills_match', jsonb_build_object(
        'points', LEAST(1.0, COALESCE(c.match_count,0)::numeric / 5.0) * w.expertise_weight,
        'matched', COALESCE(to_jsonb(c.matched_tags), '[]'::jsonb)
      ),
      'trust', jsonb_build_object(
        'points', LEAST(1.0, v_trust/60.0) * w.trust_weight,
        'reason', v_verified || ' verified achievements (trust=' || round(v_trust,1) || ')'
      ),
      'experience', jsonb_build_object(
        'points', LEAST(1.0,(v_verified+v_contribs)::numeric/3.0) * w.experience_weight,
        'reason', v_contribs || ' startup contributions'
      ),
      'intent', jsonb_build_object('points', 0, 'reason', 'no recorded interactions yet'),
      'freshness', jsonb_build_object(
        'points', (c.freshness_days/30.0) * w.freshness_weight,
        'reason', 'posted ' || round(EXTRACT(EPOCH FROM (now()-c.created_at))/86400)::int || ' days ago'
      ),
      'weights', jsonb_build_object(
        'expertise', w.expertise_weight, 'trust', w.trust_weight,
        'experience', w.experience_weight, 'intent', w.intent_weight,
        'freshness', w.freshness_weight
      )
    ),
    CASE c.kind
      WHEN 'job' THEN 'Apply to job'
      WHEN 'training' THEN 'Enrol in training'
      WHEN 'consulting' THEN 'Propose consulting'
      WHEN 'tender' THEN 'Bid on tender'
      WHEN 'startup' THEN 'Join startup'
      ELSE 'View opportunity'
    END,
    v_max_version,
    now()
  FROM computed c, (SELECT w.*) w
  WHERE
      LEAST(1.0, COALESCE(c.match_count,0)::numeric / 5.0) * w.expertise_weight
    + LEAST(1.0, v_trust / 60.0) * w.trust_weight
    + LEAST(1.0, (v_verified + v_contribs)::numeric / 3.0) * w.experience_weight
    + (c.freshness_days / 30.0) * w.freshness_weight > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $fn$;

REVOKE EXECUTE ON FUNCTION public.recompute_opportunity_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_opportunity_matches(uuid) TO authenticated, service_role;

-- Backfill: emit opportunity_created + opportunity_published for existing rows
CREATE OR REPLACE FUNCTION public.backfill_opportunity_events_v1()
RETURNS TABLE(source text, attempted bigint, newly_emitted bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_att bigint; v_ins bigint;
BEGIN
  WITH src AS (
    SELECT id::text AS oid, user_id, 'job' AS kind, title, sector, created_at
      FROM public.job_opportunities
    UNION ALL
    SELECT id::text, user_id, 'training', title, category, created_at FROM public.training_opportunities
    UNION ALL
    SELECT id::text, user_id, 'consulting', COALESCE(title,client_name), consulting_firm, created_at
      FROM public.consultant_opportunities
    UNION ALL
    SELECT id::text, user_id, 'tender', title, sector, created_at FROM public.tenders
    UNION ALL
    SELECT id::text, creator_id, 'startup', title, sector, created_at FROM public.startup_ideas
  ),
  ins AS (
    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'opportunity_created'::graph_event_type, 1, 'opportunity', s.oid, 'opportunities',
      'opportunity_created:v1:'||s.kind||':'||s.oid,
      jsonb_build_object('opportunity_id', s.oid, 'opportunity_kind', s.kind,
        'title', s.title, 'sector', COALESCE(s.sector,'')),
      1, COALESCE(s.created_at, now())
    FROM src s
    WHERE s.user_id IS NOT NULL
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_att, v_ins;
  RETURN QUERY SELECT 'opportunity_created'::text, v_att, v_ins;
END $fn$;

REVOKE EXECUTE ON FUNCTION public.backfill_opportunity_events_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.backfill_opportunity_events_v1() TO service_role;
