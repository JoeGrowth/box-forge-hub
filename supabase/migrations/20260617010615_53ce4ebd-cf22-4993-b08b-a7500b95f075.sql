
-- =========================================================
-- P0.1 — applications
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM
    ('submitted','reviewing','shortlisted','accepted','rejected','withdrawn','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.application_opportunity_kind AS ENUM
    ('job','startup','tender','consulting','training');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  opportunity_type public.application_opportunity_kind NOT NULL,
  owner_id uuid,
  status public.application_status NOT NULL DEFAULT 'submitted',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  shortlisted_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, opportunity_id, opportunity_type)
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON public.applications(opportunity_id, opportunity_type);
CREATE INDEX IF NOT EXISTS idx_applications_owner ON public.applications(owner_id, status);

GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_select_own_or_owner" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = applicant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "applications_insert_self" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "applications_update_own_or_owner" ON public.applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = applicant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = applicant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.emit_application_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name text;
  v_ts timestamptz := now();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_name := 'application_submitted';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_name := 'application_' || NEW.status::text;
    IF NEW.status = 'reviewing'   AND NEW.reviewed_at    IS NULL THEN NEW.reviewed_at    := v_ts; END IF;
    IF NEW.status = 'shortlisted' AND NEW.shortlisted_at IS NULL THEN NEW.shortlisted_at := v_ts; END IF;
    IF NEW.status = 'accepted'    AND NEW.accepted_at    IS NULL THEN NEW.accepted_at    := v_ts; END IF;
    IF NEW.status = 'rejected'    AND NEW.rejected_at    IS NULL THEN NEW.rejected_at    := v_ts; END IF;
    IF NEW.status = 'withdrawn'   AND NEW.withdrawn_at   IS NULL THEN NEW.withdrawn_at   := v_ts; END IF;
    IF NEW.status = 'completed'   AND NEW.completed_at   IS NULL THEN NEW.completed_at   := v_ts; END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.graph_events (
    user_id, event_type, event_version, aggregate_type, aggregate_id,
    source_module, idempotency_key, payload, weight, occurred_at
  ) VALUES (
    NEW.applicant_id, v_event_name::public.graph_event_type, 1, 'application', NEW.id::text,
    'applications',
    v_event_name || ':v1:' || NEW.id::text || ':' || NEW.status::text,
    jsonb_build_object(
      'application_id', NEW.id::text,
      'applicant_id', NEW.applicant_id::text,
      'opportunity_id', NEW.opportunity_id::text,
      'opportunity_type', NEW.opportunity_type::text,
      'owner_id', NEW.owner_id::text,
      'status', NEW.status::text,
      'transitioned_at', v_ts
    ),
    1, v_ts
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END $$;

INSERT INTO public.event_catalog (event_type, event_version, source_module, description, deprecated)
VALUES
  ('application_submitted',    1, 'applications', 'Applicant created an application', false),
  ('application_reviewing',    1, 'applications', 'Owner marked application under review', false),
  ('application_shortlisted',  1, 'applications', 'Owner shortlisted the applicant', false),
  ('application_accepted',     1, 'applications', 'Owner accepted the applicant', false),
  ('application_rejected',     1, 'applications', 'Owner rejected the application', false),
  ('application_withdrawn',    1, 'applications', 'Applicant withdrew', false),
  ('application_completed',    1, 'applications', 'Engagement completed', false),
  ('cold_start_seeded',        1, 'cold_start',   'New user received synthesized expertise', false),
  ('cold_start_confirmed',     1, 'cold_start',   'User confirmed estimated expertise', false),
  ('notification_dispatched',  1, 'notifications','Notification queued for delivery', false),
  ('notification_delivered',   1, 'notifications','Notification delivered', false),
  ('notification_failed',      1, 'notifications','Notification delivery failed', false)
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE TRIGGER applications_lifecycle_emit
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.emit_application_lifecycle_event();

-- =========================================================
-- P0.2 — cold_start_profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cold_start_profiles (
  user_id uuid PRIMARY KEY,
  decoder_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  seed_source text NOT NULL DEFAULT 'nr_decoder',
  confidence numeric NOT NULL DEFAULT 0,
  estimated_expertise jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_expertise jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cold_start_profiles TO authenticated;
GRANT ALL ON public.cold_start_profiles TO service_role;

ALTER TABLE public.cold_start_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cold_start_select_self" ON public.cold_start_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cold_start_insert_self" ON public.cold_start_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cold_start_update_self" ON public.cold_start_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER cold_start_profiles_updated_at
  BEFORE UPDATE ON public.cold_start_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- P0.3 — notification_deliveries
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.notification_delivery_state AS ENUM
    ('created','queued','sent','opened','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  source_event_id uuid,
  channel text NOT NULL DEFAULT 'in_app',
  state public.notification_delivery_state NOT NULL DEFAULT 'created',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  queued_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_deliveries_user_state ON public.notification_deliveries(user_id, state);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_state_created ON public.notification_deliveries(state, created_at);

GRANT SELECT, UPDATE ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_self" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif_update_self_open" ON public.notification_deliveries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- P0.5 — Beta operations console view
-- =========================================================
CREATE OR REPLACE VIEW public.admin_beta_health AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.expertise_graph WHERE expertise_score > 0) AS users_with_expertise,
  (SELECT COUNT(*) FROM public.trust_graph WHERE trust_score > 0) AS users_with_trust,
  (SELECT COUNT(*) FROM public.opportunity_graph) AS recommendation_rows,
  (SELECT COUNT(DISTINCT user_id) FROM public.opportunity_graph) AS users_with_recommendations,
  (SELECT COUNT(*) FROM public.graph_events WHERE occurred_at > now() - interval '24 hours') AS events_24h,
  (SELECT COUNT(*) FROM public.graph_dead_letters) AS dlq_size,
  (SELECT COUNT(*) FROM public.applications) AS applications_total,
  (SELECT COUNT(*) FROM public.applications WHERE status='accepted') AS applications_accepted,
  (SELECT COUNT(*) FROM public.applications WHERE status='completed') AS applications_completed,
  (SELECT COUNT(*) FROM public.growth_loop_runs WHERE created_at > now() - interval '7 days') AS loops_7d,
  (SELECT COUNT(*) FROM public.growth_loop_runs WHERE status='converted' AND created_at > now() - interval '7 days') AS loops_converted_7d,
  (SELECT COUNT(*) FROM public.notification_deliveries WHERE state='failed') AS notif_failed,
  (SELECT COUNT(*) FROM public.notification_deliveries WHERE state IN ('sent','opened')) AS notif_delivered;

GRANT SELECT ON public.admin_beta_health TO authenticated;
