
CREATE TABLE IF NOT EXISTS public.box_ecosystem_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (user_id, box_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.box_ecosystem_admins TO authenticated;
GRANT ALL ON public.box_ecosystem_admins TO service_role;

ALTER TABLE public.box_ecosystem_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage box ecosystem admins"
ON public.box_ecosystem_admins FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Ecosystem admins read own assignments"
ON public.box_ecosystem_admins FOR SELECT
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.grant_box_role(
  _target_user uuid,
  _box_name text,
  _role text,
  _override_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid := auth.uid();
  _box_id uuid;
  _slug text;
  _result jsonb;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant box roles';
  END IF;
  IF _role NOT IN ('advisor','ecosystem_admin') THEN
    RAISE EXCEPTION 'Unsupported role: %', _role;
  END IF;

  _slug := regexp_replace(lower(trim(_box_name)), '[^a-z0-9]+', '-', 'g');
  _slug := regexp_replace(_slug, '(^-+|-+$)', '', 'g');

  SELECT id INTO _box_id FROM public.boxes
   WHERE lower(name) = lower(_box_name) OR slug = _slug
   LIMIT 1;

  IF _box_id IS NULL THEN
    INSERT INTO public.boxes (slug, name, description)
    VALUES (_slug, _box_name, 'Auto-created via admin role assignment.')
    RETURNING id INTO _box_id;
  END IF;

  IF _role = 'advisor' THEN
    INSERT INTO public.box_advisors (user_id, box_id, status, approved_by, approved_at, accepting_requests, override_reason)
    VALUES (_target_user, _box_id, 'active', _admin, now(), true, _override_reason)
    ON CONFLICT (user_id, box_id) DO UPDATE
      SET status='active', approved_by=_admin, approved_at=now(),
          accepting_requests=true,
          override_reason=COALESCE(EXCLUDED.override_reason, public.box_advisors.override_reason),
          updated_at=now();
  ELSIF _role = 'ecosystem_admin' THEN
    INSERT INTO public.box_ecosystem_admins (user_id, box_id, assigned_by, notes)
    VALUES (_target_user, _box_id, _admin, _override_reason)
    ON CONFLICT (user_id, box_id) DO UPDATE
      SET assigned_by=_admin, assigned_at=now(), notes=COALESCE(EXCLUDED.notes, public.box_ecosystem_admins.notes);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, 'box_manager')
    ON CONFLICT DO NOTHING;
  END IF;

  _result := jsonb_build_object(
    'box_id', _box_id,
    'box_name', _box_name,
    'slug', _slug,
    'role', _role,
    'target_user', _target_user
  );
  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_box_role(uuid, text, text, text) TO authenticated, service_role;
