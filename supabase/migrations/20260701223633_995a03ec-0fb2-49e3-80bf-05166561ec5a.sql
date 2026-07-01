
CREATE OR REPLACE FUNCTION public.request_entity_role_link(
  _assignment_id UUID,
  _linked_user_id UUID,
  _equity_pct NUMERIC DEFAULT NULL,
  _label TEXT DEFAULT NULL
) RETURNS public.entity_role_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.entity_role_assignments; v_actor UUID; v_type TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_row FROM public.entity_role_assignments WHERE id = _assignment_id FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF NOT public.is_entity_admin(v_row.entity_type, v_row.entity_id, v_actor) THEN
    RAISE EXCEPTION 'not entity admin';
  END IF;
  IF v_row.status = 'accepted' THEN
    RAISE EXCEPTION 'slot already linked; revoke first';
  END IF;

  SELECT role_type INTO v_type FROM public.role_catalog WHERE role_slug = v_row.role_slug AND effective_until IS NULL ORDER BY version DESC LIMIT 1;
  IF v_type <> 'OWNER' THEN _equity_pct := NULL; END IF;

  UPDATE public.entity_role_assignments SET
    linked_user_id = _linked_user_id,
    equity_pct = COALESCE(_equity_pct, equity_pct),
    label = COALESCE(_label, label),
    status = 'pending',
    linked_by = v_actor,
    linked_at = now(),
    accepted_at = NULL, declined_at = NULL, revoked_at = NULL,
    effective_from = NULL, effective_until = NULL
  WHERE id = _assignment_id
  RETURNING * INTO v_row;

  INSERT INTO public.entity_role_audit_log(assignment_id, transition, actor_user_id, payload)
  VALUES (v_row.id,'requested',v_actor,
    jsonb_build_object('linked_user_id',_linked_user_id,'equity_pct',_equity_pct));

  BEGIN
    INSERT INTO public.graph_events(user_id, event_type, event_version, aggregate_type, aggregate_id,
      source_module, idempotency_key, payload, weight, occurred_at)
    VALUES (v_actor, 'role.link.requested'::text::graph_event_type_enum, 1, 'entity_role', v_row.id,
      'entity_role_service',
      'role.link.requested:'||v_row.id::text||':'||extract(epoch from now())::text,
      jsonb_build_object('assignment_id',v_row.id,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id,
                         'role_slug',v_row.role_slug,'user_id',_linked_user_id),
      1, now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.user_notifications(user_id, notification_type, title, message, link)
    VALUES (_linked_user_id, 'role_link_request',
            'Role link requested',
            'You have been proposed for the "' || v_row.label || '" role. Open your profile to accept or decline.',
            '/profile#role-links');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

UPDATE public.user_notifications
SET link = '/profile#role-links'
WHERE notification_type = 'role_link_request'
  AND (link IS NULL OR link = '/notifications');
