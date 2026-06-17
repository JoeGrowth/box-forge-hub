
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_type text NOT NULL, -- 'applicant' | 'owner' | 'recipient' | 'matched_user' | 'user' | 'self'
  channel text NOT NULL DEFAULT 'in_app',
  priority int NOT NULL DEFAULT 50,
  title_template text NOT NULL,
  message_template text NOT NULL,
  link_template text,
  notification_type text NOT NULL DEFAULT 'system', -- maps to user_notifications.notification_type
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, recipient_type, channel)
);

GRANT SELECT ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_rules_admin_select" ON public.notification_rules
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotency guard on deliveries: one row per (source_event_id, user_id, channel, template)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_deliveries_idem
  ON public.notification_deliveries (source_event_id, user_id, channel, event_type)
  WHERE source_event_id IS NOT NULL;

-- Seed core rules
INSERT INTO public.notification_rules
  (event_type, recipient_type, channel, priority, notification_type, title_template, message_template, link_template)
VALUES
  ('application_submitted',     'owner',        'in_app', 10, 'application',  'New application received',           'You received a new application for your {{opportunity_type}}.', '/messages'),
  ('application_accepted',      'applicant',    'in_app', 10, 'application',  'Application accepted',                'Your application was accepted. Coordinate next steps with the owner.', '/messages'),
  ('application_rejected',      'applicant',    'in_app', 20, 'application',  'Application update',                  'Your application was not selected this time. Keep building signals.', '/profile'),
  ('application_shortlisted',   'applicant',    'in_app', 15, 'application',  'You were shortlisted',                'You moved to shortlist for an opportunity. Watch your messages.', '/messages'),
  ('application_completed',     'applicant',    'in_app', 10, 'achievement',  'Engagement completed',                'Your completed engagement updates Trust and Reputation graphs.', '/profile'),
  ('application_completed',     'owner',        'in_app', 20, 'achievement',  'Engagement completed',                'Engagement closed. The applicant trust + reputation graphs updated.', '/profile'),
  ('opportunity_match_created', 'matched_user', 'in_app', 30, 'match',        'New opportunities for you',           'New opportunities match your profile. Open the feed to review.', '/opportunities'),
  ('message_received',          'recipient',    'in_app', 5,  'message',      'New message',                         'You have a new message.', '/messages'),
  ('growth_loop_triggered',     'user',         'in_app', 25, 'growth_loop',  '{{loop_title}}',                      '{{loop_message}}', '/profile'),
  ('recommendation_available',  'user',         'in_app', 15, 'recommendation','Your first recommendations are ready','We seeded your profile and generated your starting opportunities.', '/opportunities')
ON CONFLICT (event_type, recipient_type, channel) DO NOTHING;

-- Register new event types in the catalog
INSERT INTO public.event_catalog (event_type, event_version, source_module, description, deprecated) VALUES
  ('recommendation_available', 1, 'recommendations', 'First (or refreshed) batch of recommendations is ready for the user', false)
ON CONFLICT (event_type, event_version) DO NOTHING;

-- ============================================================
-- Dispatcher
-- ============================================================
CREATE OR REPLACE FUNCTION public.render_template(_tpl text, _ctx jsonb)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE r text := _tpl; k text; v text;
BEGIN
  IF _ctx IS NULL OR _tpl IS NULL THEN RETURN _tpl; END IF;
  FOR k IN SELECT jsonb_object_keys(_ctx) LOOP
    v := COALESCE(_ctx ->> k, '');
    r := replace(r, '{{' || k || '}}', v);
  END LOOP;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_notifications_for_event(_event_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ev record;
  r record;
  v_recipient uuid;
  v_ctx jsonb;
  v_title text; v_message text; v_link text;
  v_count int := 0;
BEGIN
  SELECT * INTO v_ev FROM public.graph_events WHERE id = _event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR r IN
    SELECT * FROM public.notification_rules
     WHERE enabled = true AND event_type = v_ev.event_type::text
     ORDER BY priority ASC
  LOOP
    -- Resolve recipient
    v_recipient := CASE r.recipient_type
      WHEN 'self'         THEN v_ev.user_id
      WHEN 'user'         THEN v_ev.user_id
      WHEN 'applicant'    THEN COALESCE((v_ev.payload->>'applicant_id')::uuid, v_ev.user_id)
      WHEN 'owner'        THEN NULLIF(v_ev.payload->>'owner_id','')::uuid
      WHEN 'recipient'    THEN NULLIF(v_ev.payload->>'recipient_id','')::uuid
      WHEN 'matched_user' THEN v_ev.user_id
      ELSE v_ev.user_id
    END;
    IF v_recipient IS NULL THEN CONTINUE; END IF;

    v_ctx := COALESCE(v_ev.payload, '{}'::jsonb)
          || jsonb_build_object(
               'event_type', v_ev.event_type,
               'aggregate_id', v_ev.aggregate_id,
               'aggregate_type', v_ev.aggregate_type
             );

    v_title   := public.render_template(r.title_template,   v_ctx);
    v_message := public.render_template(r.message_template, v_ctx);
    v_link    := public.render_template(r.link_template,    v_ctx);

    -- Idempotent insert into delivery ledger
    INSERT INTO public.notification_deliveries
      (user_id, event_type, source_event_id, channel, state, payload, queued_at)
    VALUES
      (v_recipient, r.event_type, v_ev.id, r.channel, 'queued',
       jsonb_build_object('title', v_title, 'message', v_message, 'link', v_link,
                          'notification_type', r.notification_type, 'priority', r.priority),
       now())
    ON CONFLICT (source_event_id, user_id, channel, event_type)
      WHERE source_event_id IS NOT NULL
      DO NOTHING;

    -- For in_app channel, also insert the visible row
    IF r.channel = 'in_app' THEN
      INSERT INTO public.user_notifications
        (user_id, title, message, notification_type, link)
      VALUES (v_recipient, v_title, v_message, r.notification_type, v_link);

      UPDATE public.notification_deliveries
         SET state = 'sent', sent_at = now()
       WHERE source_event_id = v_ev.id AND user_id = v_recipient AND channel = r.channel;
    END IF;

    -- Emit dispatch event (idempotent)
    INSERT INTO public.graph_events
      (user_id, event_type, event_version, aggregate_type, aggregate_id,
       source_module, idempotency_key, payload, weight, occurred_at)
    VALUES
      (v_recipient, 'notification_dispatched'::public.graph_event_type, 1, 'notification', v_ev.id::text,
       'notifications',
       'notification_dispatched:v1:' || v_ev.id::text || ':' || v_recipient::text || ':' || r.channel,
       jsonb_build_object('rule_event', r.event_type, 'channel', r.channel, 'title', v_title),
       1, now())
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.dispatch_notifications_for_event(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_notifications_for_event(uuid) TO service_role;

-- ============================================================
-- P0.2 cold-start seeding helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_cold_start_expertise(_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.cold_start_profiles;
  v_user_node uuid;
  v_skill_node uuid;
  v_tag text;
  v_count int := 0;
BEGIN
  SELECT * INTO v_profile FROM public.cold_start_profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_user_node := public.graph_upsert_node('user'::public.graph_node_type, _user_id::text, NULL, '{}'::jsonb);

  FOR v_tag IN SELECT jsonb_array_elements_text(COALESCE(v_profile.estimated_expertise, '[]'::jsonb))
  LOOP
    v_skill_node := public.graph_upsert_node(
      'skill'::public.graph_node_type, lower(v_tag), v_tag, '{}'::jsonb
    );
    PERFORM public.graph_upsert_edge(
      v_user_node, v_skill_node, 'HAS_SKILL'::public.graph_edge_type,
      0.5,  -- low weight for estimated
      jsonb_build_object(
        'estimated', true,
        'source', v_profile.seed_source,
        'confidence', v_profile.confidence
      ),
      NULL, now()
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.seed_cold_start_expertise(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_cold_start_expertise(uuid) TO service_role;
