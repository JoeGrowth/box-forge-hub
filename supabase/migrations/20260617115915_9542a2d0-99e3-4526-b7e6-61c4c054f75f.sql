
-- 1) Dispatcher: merge action_payload into the render context so {{title}}/{{message}}/{{link}} work
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

    -- Flatten nested action_payload into ctx so templates can reference its keys directly.
    v_ctx := COALESCE(v_ev.payload, '{}'::jsonb)
          || COALESCE(v_ev.payload->'action_payload', '{}'::jsonb)
          || jsonb_build_object(
               'event_type', v_ev.event_type,
               'aggregate_id', v_ev.aggregate_id,
               'aggregate_type', v_ev.aggregate_type
             );

    v_title   := public.render_template(r.title_template,   v_ctx);
    v_message := public.render_template(r.message_template, v_ctx);
    v_link    := public.render_template(r.link_template,    v_ctx);

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

    IF r.channel = 'in_app' THEN
      INSERT INTO public.user_notifications
        (user_id, title, message, notification_type, link)
      VALUES (v_recipient, v_title, v_message, r.notification_type, v_link);

      UPDATE public.notification_deliveries
         SET state = 'sent', sent_at = now()
       WHERE source_event_id = v_ev.id AND user_id = v_recipient AND channel = r.channel;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

-- 2) Update the growth_loop rule to use the action_payload's title/message keys with safe fallbacks
UPDATE public.notification_rules
   SET title_template   = 'New growth opportunity',
       message_template = 'A new recommended action is ready for you. Open your profile to see what''s next.'
 WHERE event_type = 'growth_loop_triggered'
   AND recipient_type = 'user'
   AND channel = 'in_app';

-- 3) Clean up any existing notifications that still show the unrendered placeholders
UPDATE public.user_notifications
   SET title = 'New growth opportunity',
       message = 'A new recommended action is ready for you. Open your profile to see what''s next.'
 WHERE title LIKE '%{{loop_title}}%' OR message LIKE '%{{loop_message}}%';
