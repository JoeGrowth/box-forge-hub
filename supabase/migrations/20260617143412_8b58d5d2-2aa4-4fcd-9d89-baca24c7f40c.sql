
-- ================================================================
-- Structural fix: startup_applications had no lifecycle emitter,
-- so the projection trigger never observed its transitions. Mirror
-- emit_application_lifecycle_event() onto startup_applications with
-- category='startup' so the state machine is fed from this source too.
-- ================================================================

CREATE OR REPLACE FUNCTION public.emit_startup_application_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name text;
  v_status_mapped text;
  v_ts timestamptz := now();
BEGIN
  -- Normalize status to the canonical lifecycle vocabulary
  v_status_mapped := CASE NEW.status
    WHEN 'pending'  THEN 'submitted'
    WHEN 'accepted' THEN 'accepted'
    WHEN 'rejected' THEN 'rejected'
    ELSE NULL
  END;

  IF TG_OP = 'INSERT' THEN
    v_event_name := 'application_submitted';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_status_mapped IS NULL THEN RETURN NEW; END IF;
    v_event_name := 'application_' || v_status_mapped;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.graph_events (
    user_id, event_type, event_version, aggregate_type, aggregate_id,
    source_module, idempotency_key, payload, weight, occurred_at
  ) VALUES (
    NEW.applicant_id, v_event_name::public.graph_event_type, 1,
    'startup_application', NEW.id::text,
    'startup_applications',
    v_event_name || ':v1:' || NEW.id::text || ':' || NEW.status::text,
    jsonb_build_object(
      'application_id', NEW.id::text,
      'applicant_id', NEW.applicant_id::text,
      'opportunity_id', NEW.startup_id::text,
      'opportunity_type', 'startup',
      'status', v_status_mapped,
      'transitioned_at', v_ts
    ),
    1, v_ts
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS startup_applications_lifecycle_emit ON public.startup_applications;
CREATE TRIGGER startup_applications_lifecycle_emit
AFTER INSERT OR UPDATE ON public.startup_applications
FOR EACH ROW EXECUTE FUNCTION public.emit_startup_application_lifecycle_event();

-- ================================================================
-- Backfill: replay existing startup_applications as projection rows.
-- We emit synthetic application_submitted events first (idempotency
-- key prevents duplicates if a row already had one), then, for rows
-- whose current status is terminal, emit the corresponding event.
-- The projection trigger handles the rest.
-- ================================================================

-- 1) Synthesize a submitted event for every row (idempotent)
INSERT INTO public.graph_events (
  user_id, event_type, event_version, aggregate_type, aggregate_id,
  source_module, idempotency_key, payload, weight, occurred_at
)
SELECT
  sa.applicant_id,
  'application_submitted'::public.graph_event_type, 1,
  'startup_application', sa.id::text,
  'startup_applications_backfill',
  'application_submitted:v1:' || sa.id::text || ':backfill',
  jsonb_build_object(
    'application_id', sa.id::text,
    'applicant_id', sa.applicant_id::text,
    'opportunity_id', sa.startup_id::text,
    'opportunity_type', 'startup',
    'status', 'submitted',
    'backfill', true
  ),
  1, sa.created_at
FROM public.startup_applications sa
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- 2) For rows already in a terminal state, replay the terminal event
INSERT INTO public.graph_events (
  user_id, event_type, event_version, aggregate_type, aggregate_id,
  source_module, idempotency_key, payload, weight, occurred_at
)
SELECT
  sa.applicant_id,
  ('application_' || sa.status)::public.graph_event_type, 1,
  'startup_application', sa.id::text,
  'startup_applications_backfill',
  'application_' || sa.status || ':v1:' || sa.id::text || ':backfill',
  jsonb_build_object(
    'application_id', sa.id::text,
    'applicant_id', sa.applicant_id::text,
    'opportunity_id', sa.startup_id::text,
    'opportunity_type', 'startup',
    'status', sa.status,
    'backfill', true
  ),
  1, COALESCE(sa.updated_at, sa.created_at)
FROM public.startup_applications sa
WHERE sa.status IN ('accepted','rejected')
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
