
-- 1) Move advisors / admins / refs from duplicate "Box For ..." rows into the seeded "Box 4 ..." rows, then delete duplicates.
DO $$
DECLARE
  pair RECORD;
BEGIN
  FOR pair IN
    SELECT dup.id AS dup_id, seed.id AS seed_id
    FROM public.boxes dup
    JOIN public.boxes seed
      ON regexp_replace(lower(seed.name), '\s+(4|for)\s+', ' ', 'g')
       = regexp_replace(lower(dup.name),  '\s+(4|for)\s+', ' ', 'g')
     AND seed.id <> dup.id
    WHERE dup.slug LIKE 'box-for-%'
  LOOP
    UPDATE public.box_advisors SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.box_ecosystem_admins SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.box_inbound_requests SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.advisor_relationships SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.commitments SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.opportunities SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    UPDATE public.ritual_instances SET box_id = pair.seed_id WHERE box_id = pair.dup_id;
    DELETE FROM public.boxes WHERE id = pair.dup_id;
  END LOOP;
END $$;

-- 2) Rename seeded "Box 4 ..." names to "Box For ..." (keep slugs stable for any URLs).
UPDATE public.boxes
SET name = regexp_replace(name, '^Box 4 ', 'Box For ')
WHERE name LIKE 'Box 4 %';

-- 3) Replace grant_box_role with a canonical-name matcher (treats "4" and "for" as equivalent).
CREATE OR REPLACE FUNCTION public.grant_box_role(_target_user uuid, _box_name text, _role text, _override_reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _admin uuid := auth.uid();
  _box_id uuid;
  _slug text;
  _canonical text;
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

  -- Canonical form: collapse "4" / "for" into a single token and strip punctuation.
  _canonical := regexp_replace(lower(trim(_box_name)), '[^a-z0-9]+', ' ', 'g');
  _canonical := regexp_replace(_canonical, '\s+(4|for)\s+', ' ', 'g');
  _canonical := regexp_replace(_canonical, '\s+', ' ', 'g');

  SELECT id INTO _box_id FROM public.boxes
   WHERE slug = _slug
      OR lower(name) = lower(_box_name)
      OR regexp_replace(
           regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'),
           '\s+(4|for)\s+', ' ', 'g'
         ) = _canonical
   ORDER BY (slug = _slug) DESC, (lower(name) = lower(_box_name)) DESC
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

  RETURN jsonb_build_object(
    'box_id', _box_id,
    'box_name', (SELECT name FROM public.boxes WHERE id = _box_id),
    'slug', (SELECT slug FROM public.boxes WHERE id = _box_id),
    'role', _role,
    'target_user', _target_user
  );
END;
$function$;
