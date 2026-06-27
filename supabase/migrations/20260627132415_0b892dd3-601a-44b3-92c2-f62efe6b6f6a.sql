
-- 1. Normalize box slugs (strip "box4" prefix)
UPDATE public.boxes
SET slug = regexp_replace(slug, '^box4', '')
WHERE slug ~ '^box4';

-- 2. Rate limit + cooldown trigger on box_inbound_requests
CREATE OR REPLACE FUNCTION public.enforce_box_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
  cooldown_count INT;
BEGIN
  -- Hourly cap
  SELECT count(*) INTO recent_count
  FROM public.box_inbound_requests
  WHERE requester_id = NEW.requester_id
    AND created_at > now() - interval '60 minutes';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: max 5 advisor requests per hour'
      USING ERRCODE = '23514';
  END IF;

  -- Cooldown for same box + same type
  SELECT count(*) INTO cooldown_count
  FROM public.box_inbound_requests
  WHERE requester_id = NEW.requester_id
    AND request_type = NEW.request_type
    AND coalesce(box_id::text,'') = coalesce(NEW.box_id::text,'')
    AND created_at > now() - interval '10 minutes';
  IF cooldown_count >= 1 THEN
    RAISE EXCEPTION 'cooldown_active: please wait 10 minutes before sending a similar request'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_box_inbound_requests_rate_limit ON public.box_inbound_requests;
CREATE TRIGGER trg_box_inbound_requests_rate_limit
BEFORE INSERT ON public.box_inbound_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_box_request_rate_limit();

-- 3. Audit log
CREATE TABLE IF NOT EXISTS public.box_request_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.box_inbound_requests(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_box_request_audit_request ON public.box_request_audit_log(request_id, created_at DESC);

GRANT SELECT ON public.box_request_audit_log TO authenticated;
GRANT ALL ON public.box_request_audit_log TO service_role;

ALTER TABLE public.box_request_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all audit"
ON public.box_request_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Requester reads own audit"
ON public.box_request_audit_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.box_inbound_requests r
  WHERE r.id = box_request_audit_log.request_id
    AND r.requester_id = auth.uid()
));

CREATE POLICY "Assigned advisor reads audit"
ON public.box_request_audit_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.box_inbound_requests r
  WHERE r.id = box_request_audit_log.request_id
    AND r.assigned_advisor_id = auth.uid()
));

-- Trigger: record creation + status transitions + advisor assignment
CREATE OR REPLACE FUNCTION public.log_box_request_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_actor IS NOT NULL THEN
    v_is_admin := public.has_role(v_actor, 'admin');
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.box_request_audit_log(request_id, actor_id, action, from_status, to_status, metadata)
    VALUES (NEW.id, v_actor, 'created', NULL, NEW.status,
            jsonb_build_object('request_type', NEW.request_type, 'box_id', NEW.box_id));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.box_request_audit_log(request_id, actor_id, action, from_status, to_status, metadata)
      VALUES (
        NEW.id, v_actor,
        CASE
          WHEN NEW.status = 'accepted' THEN 'accepted'
          WHEN NEW.status = 'archived' THEN 'declined_or_archived'
          WHEN NEW.status = 'completed' THEN 'completed'
          WHEN NEW.status = 'matched' THEN 'matched'
          ELSE 'status_changed'
        END,
        OLD.status, NEW.status,
        jsonb_build_object('admin_override', v_is_admin AND NEW.assigned_advisor_id IS DISTINCT FROM v_actor)
      );
    END IF;

    IF NEW.assigned_advisor_id IS DISTINCT FROM OLD.assigned_advisor_id THEN
      INSERT INTO public.box_request_audit_log(request_id, actor_id, action, from_status, to_status, metadata)
      VALUES (
        NEW.id, v_actor,
        CASE WHEN OLD.assigned_advisor_id IS NULL THEN 'assigned' ELSE 'reassigned' END,
        OLD.status, NEW.status,
        jsonb_build_object(
          'previous_advisor', OLD.assigned_advisor_id,
          'new_advisor', NEW.assigned_advisor_id,
          'admin_override', v_is_admin
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_box_request_audit ON public.box_inbound_requests;
CREATE TRIGGER trg_box_request_audit
AFTER INSERT OR UPDATE ON public.box_inbound_requests
FOR EACH ROW EXECUTE FUNCTION public.log_box_request_audit();
