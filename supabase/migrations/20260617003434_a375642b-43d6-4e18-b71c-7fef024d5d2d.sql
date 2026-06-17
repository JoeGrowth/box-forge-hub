
INSERT INTO public.event_catalog (event_type, event_version, source_module, payload_schema, deprecated)
VALUES
  ('equity_offer_created','1','ownership','{"required":["allocation_id","venture_id","user_id","percentage"]}'::jsonb, false),
  ('equity_offer_accepted','1','ownership','{"required":["allocation_id","user_id"]}'::jsonb, false),
  ('equity_offer_rejected','1','ownership','{"required":["allocation_id","user_id"]}'::jsonb, false),
  ('equity_allocation_created','1','ownership','{"required":["allocation_id","venture_id","user_id","percentage"]}'::jsonb, false),
  ('vesting_started','1','ownership','{"required":["allocation_id","schedule_id"]}'::jsonb, false),
  ('vesting_milestone_completed','1','ownership','{"required":["allocation_id","percentage"]}'::jsonb, false),
  ('equity_transferred','1','ownership','{"required":["allocation_id","from_user_id","to_user_id","percentage"]}'::jsonb, false),
  ('equity_revoked','1','ownership','{"required":["allocation_id","percentage"]}'::jsonb, false),
  ('ownership_exit_requested','1','ownership','{"required":["allocation_id","user_id"]}'::jsonb, false)
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.derived_equity_role(_percentage numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _percentage IS NULL OR _percentage <= 0 THEN 'CONTRIBUTOR'
    WHEN _percentage <= 5  THEN 'MLCB'
    WHEN _percentage <= 10 THEN 'MMCB'
    WHEN _percentage <= 15 THEN 'MVCB'
    ELSE 'FOUNDER'
  END
$$;

CREATE TABLE IF NOT EXISTS public.equity_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text,
  percentage numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'proposed',
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_allocations TO authenticated;
GRANT ALL ON public.equity_allocations TO service_role;
ALTER TABLE public.equity_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ea_select_holder" ON public.equity_allocations;
DROP POLICY IF EXISTS "ea_select_initiator" ON public.equity_allocations;
DROP POLICY IF EXISTS "ea_insert_initiator" ON public.equity_allocations;
DROP POLICY IF EXISTS "ea_update_holder_or_initiator" ON public.equity_allocations;
DROP POLICY IF EXISTS "ea_admin_all" ON public.equity_allocations;
CREATE POLICY "ea_select_holder" ON public.equity_allocations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ea_select_initiator" ON public.equity_allocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = equity_allocations.venture_id AND s.creator_id = auth.uid()));
CREATE POLICY "ea_insert_initiator" ON public.equity_allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = equity_allocations.venture_id AND s.creator_id = auth.uid()));
CREATE POLICY "ea_update_holder_or_initiator" ON public.equity_allocations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = equity_allocations.venture_id AND s.creator_id = auth.uid()));
CREATE POLICY "ea_admin_all" ON public.equity_allocations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_equity_allocations_updated_at ON public.equity_allocations;
CREATE TRIGGER trg_equity_allocations_updated_at
  BEFORE UPDATE ON public.equity_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ea_user    ON public.equity_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_venture ON public.equity_allocations(venture_id);

CREATE TABLE IF NOT EXISTS public.vesting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equity_allocation_id uuid NOT NULL REFERENCES public.equity_allocations(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT current_date,
  cliff_months int NOT NULL DEFAULT 12,
  vesting_months int NOT NULL DEFAULT 48,
  frequency text NOT NULL DEFAULT 'monthly',
  total_percentage numeric NOT NULL DEFAULT 0,
  vested_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vesting_schedules TO authenticated;
GRANT ALL ON public.vesting_schedules TO service_role;
ALTER TABLE public.vesting_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vs_select_party" ON public.vesting_schedules;
DROP POLICY IF EXISTS "vs_modify_party" ON public.vesting_schedules;
CREATE POLICY "vs_select_party" ON public.vesting_schedules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_allocations ea WHERE ea.id = vesting_schedules.equity_allocation_id
    AND (ea.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = ea.venture_id AND s.creator_id = auth.uid()))));
CREATE POLICY "vs_modify_party" ON public.vesting_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_allocations ea WHERE ea.id = vesting_schedules.equity_allocation_id
    AND (ea.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = ea.venture_id AND s.creator_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_allocations ea WHERE ea.id = vesting_schedules.equity_allocation_id
    AND (ea.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = ea.venture_id AND s.creator_id = auth.uid()))));

DROP TRIGGER IF EXISTS trg_vesting_schedules_updated_at ON public.vesting_schedules;
CREATE TRIGGER trg_vesting_schedules_updated_at
  BEFORE UPDATE ON public.vesting_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.equity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equity_allocation_id uuid NOT NULL REFERENCES public.equity_allocations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.equity_events TO authenticated;
GRANT ALL ON public.equity_events TO service_role;
ALTER TABLE public.equity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eev_select_party" ON public.equity_events;
DROP POLICY IF EXISTS "eev_insert_party" ON public.equity_events;
CREATE POLICY "eev_select_party" ON public.equity_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_allocations ea WHERE ea.id = equity_events.equity_allocation_id
    AND (ea.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = ea.venture_id AND s.creator_id = auth.uid()))));
CREATE POLICY "eev_insert_party" ON public.equity_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_allocations ea WHERE ea.id = equity_events.equity_allocation_id
    AND (ea.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = ea.venture_id AND s.creator_id = auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_eev_allocation ON public.equity_events(equity_allocation_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.ownership_graph (
  user_id uuid PRIMARY KEY,
  venture_count int NOT NULL DEFAULT 0,
  total_allocated_equity numeric NOT NULL DEFAULT 0,
  total_vested_equity numeric NOT NULL DEFAULT 0,
  active_allocations int NOT NULL DEFAULT 0,
  ownership_level text NOT NULL DEFAULT 'none',
  ownership_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_event_version bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ownership_graph TO authenticated;
GRANT ALL ON public.ownership_graph TO service_role;
ALTER TABLE public.ownership_graph ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "og_select_all_auth" ON public.ownership_graph;
DROP POLICY IF EXISTS "og_admin_all" ON public.ownership_graph;
CREATE POLICY "og_select_all_auth" ON public.ownership_graph FOR SELECT TO authenticated USING (true);
CREATE POLICY "og_admin_all" ON public.ownership_graph FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recompute_ownership(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ventures int := 0; v_active int := 0;
  v_allocated numeric := 0; v_vested numeric := 0;
  v_level text; v_breakdown jsonb; v_max_version bigint;
BEGIN
  SELECT COUNT(DISTINCT venture_id), COUNT(*) FILTER (WHERE status IN ('accepted','active')),
         COALESCE(SUM(percentage) FILTER (WHERE status IN ('accepted','active','completed')), 0)
    INTO v_ventures, v_active, v_allocated
    FROM public.equity_allocations WHERE user_id = _user_id;
  v_ventures := COALESCE(v_ventures,0); v_active := COALESCE(v_active,0); v_allocated := COALESCE(v_allocated,0);

  SELECT COALESCE(SUM(vs.vested_percentage), 0) INTO v_vested
    FROM public.vesting_schedules vs
    JOIN public.equity_allocations ea ON ea.id = vs.equity_allocation_id
   WHERE ea.user_id = _user_id;
  v_vested := COALESCE(v_vested,0);

  v_level := CASE
    WHEN v_allocated >= 15 THEN 'founder'
    WHEN v_allocated >= 10 THEN 'major_contributor'
    WHEN v_allocated >= 5  THEN 'meaningful_contributor'
    WHEN v_allocated >  0  THEN 'light_contributor'
    ELSE 'none'
  END;

  WITH per_alloc AS (
    SELECT ea.venture_id,
           COALESCE(s.title, ea.venture_id::text) AS venture_title,
           ea.percentage,
           public.derived_equity_role(ea.percentage) AS derived_role,
           ea.status,
           COALESCE((SELECT SUM(vs2.vested_percentage) FROM public.vesting_schedules vs2 WHERE vs2.equity_allocation_id = ea.id), 0) AS vested
      FROM public.equity_allocations ea
      LEFT JOIN public.startup_ideas s ON s.id = ea.venture_id
     WHERE ea.user_id = _user_id
  )
  SELECT jsonb_build_object(
    'ventures', v_ventures,
    'allocated', round(v_allocated, 2)::text || '%',
    'vested',    round(v_vested, 2)::text || '%',
    'contributions', COALESCE(jsonb_agg(jsonb_build_object(
      'venture',   pa.venture_title,
      'role',      pa.derived_role,
      'allocated', round(pa.percentage, 2)::text || '%',
      'vested',    round(pa.vested, 2)::text || '%',
      'status',    pa.status
    )), '[]'::jsonb)
  ) INTO v_breakdown FROM per_alloc pa;

  SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;
  v_max_version := COALESCE(v_max_version,0);

  INSERT INTO public.ownership_graph (
    user_id, venture_count, total_allocated_equity, total_vested_equity,
    active_allocations, ownership_level, ownership_breakdown,
    source_event_version, computed_at
  ) VALUES (
    _user_id, v_ventures, v_allocated, v_vested,
    v_active, v_level, COALESCE(v_breakdown, '{}'::jsonb),
    v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    venture_count=EXCLUDED.venture_count,
    total_allocated_equity=EXCLUDED.total_allocated_equity,
    total_vested_equity=EXCLUDED.total_vested_equity,
    active_allocations=EXCLUDED.active_allocations,
    ownership_level=EXCLUDED.ownership_level,
    ownership_breakdown=EXCLUDED.ownership_breakdown,
    source_event_version=EXCLUDED.source_event_version,
    computed_at=EXCLUDED.computed_at;
END $$;

-- Backfill: promote accepted/active team_compensation_offers into allocations.
CREATE OR REPLACE FUNCTION public.backfill_ownership_v1()
RETURNS TABLE(source text, attempted bigint, newly_emitted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_att bigint := 0; v_ins bigint := 0;
BEGIN
  -- 1) Promote accepted equity offers to equity_allocations (idempotent on source key).
  WITH src AS (
    SELECT o.startup_id AS venture_id, o.cobuilder_user_id AS user_id,
           COALESCE(o.time_equity_percentage,0) + COALESCE(o.performance_equity_percentage,0) AS pct,
           o.created_at, o.id AS offer_id, o.vesting_years
      FROM public.team_compensation_offers o
     WHERE o.cobuilder_user_id IS NOT NULL
       AND COALESCE(o.status,'') IN ('accepted','active','signed','completed')
  ),
  ins AS (
    INSERT INTO public.equity_allocations (venture_id, user_id, role, percentage, status, source, metadata, created_at)
    SELECT s.venture_id, s.user_id, public.derived_equity_role(s.pct), s.pct, 'active',
           'legacy_compensation_offer', jsonb_build_object('offer_id', s.offer_id::text, 'vesting_years', s.vesting_years), COALESCE(s.created_at, now())
    FROM src s
    WHERE s.pct > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.equity_allocations ea
        WHERE ea.venture_id = s.venture_id AND ea.user_id = s.user_id
          AND ea.source = 'legacy_compensation_offer'
      )
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_att, v_ins;
  RETURN QUERY SELECT 'equity_allocations_from_offers'::text, v_att, v_ins;

  -- 2) Default vesting schedule for each new allocation lacking one.
  INSERT INTO public.vesting_schedules (equity_allocation_id, total_percentage, vesting_months, cliff_months, frequency)
  SELECT ea.id, ea.percentage,
         GREATEST(12, COALESCE((ea.metadata->>'vesting_years')::int, 4) * 12),
         12, 'monthly'
    FROM public.equity_allocations ea
   WHERE ea.source = 'legacy_compensation_offer'
     AND NOT EXISTS (SELECT 1 FROM public.vesting_schedules vs WHERE vs.equity_allocation_id = ea.id);

  -- 3) Emit equity_allocation_created:v1 for each allocation (idempotent).
  WITH src AS (
    SELECT ea.id AS allocation_id, ea.user_id, ea.venture_id, ea.percentage, ea.created_at
      FROM public.equity_allocations ea
  ),
  ins2 AS (
    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.user_id, 'equity_allocation_created'::graph_event_type, 1, 'equity_allocation',
      s.allocation_id::text, 'ownership',
      'equity_allocation_created:v1:'||s.allocation_id,
      jsonb_build_object('allocation_id', s.allocation_id::text, 'venture_id', s.venture_id::text,
                         'user_id', s.user_id::text, 'percentage', s.percentage),
      1, COALESCE(s.created_at, now())
    FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins2) INTO v_att, v_ins;
  RETURN QUERY SELECT 'equity_allocation_created'::text, v_att, v_ins;
END $$;

SELECT public.backfill_ownership_v1();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.equity_allocations LOOP
    PERFORM public.recompute_ownership(r.user_id);
  END LOOP;
END $$;
