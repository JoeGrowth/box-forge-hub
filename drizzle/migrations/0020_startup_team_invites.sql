CREATE TABLE public.startup_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_type text NOT NULL DEFAULT 'MMCB',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (startup_id, email)
);
GRANT SELECT, DELETE ON public.startup_team_invites TO authenticated;
GRANT ALL ON public.startup_team_invites TO service_role;
ALTER TABLE public.startup_team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators view invites" ON public.startup_team_invites FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = startup_id AND s.creator_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Creators delete invites" ON public.startup_team_invites FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.startup_ideas s WHERE s.id = startup_id AND s.creator_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.invite_startup_team_member(_startup_id uuid, _email text, _role text DEFAULT 'MMCB')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _e text := lower(trim(_email)); _target uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM startup_ideas WHERE id=_startup_id AND creator_id=_uid) AND NOT has_role(_uid,'admin') THEN
    RAISE EXCEPTION 'Only the idea creator can add team members'; END IF;
  IF _e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  SELECT id INTO _target FROM auth.users WHERE lower(email)=_e LIMIT 1;
  IF _target IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM startup_team_members WHERE startup_id=_startup_id AND member_user_id=_target) THEN
      INSERT INTO startup_team_members(startup_id, member_user_id, added_by, role_type) VALUES (_startup_id,_target,_uid,coalesce(_role,'MMCB'));
    END IF;
    RETURN 'added';
  END IF;
  INSERT INTO startup_team_invites(startup_id,email,role_type,invited_by) VALUES (_startup_id,_e,coalesce(_role,'MMCB'),_uid)
  ON CONFLICT (startup_id,email) DO UPDATE SET status='pending', role_type=EXCLUDED.role_type;
  RETURN 'invited';
END $$;
REVOKE ALL ON FUNCTION public.invite_startup_team_member(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.invite_startup_team_member(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_startup_team_invites()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e text; r record;
BEGIN
  SELECT lower(email) INTO _e FROM auth.users WHERE id = NEW.user_id;
  IF _e IS NULL THEN RETURN NEW; END IF;
  FOR r IN SELECT * FROM startup_team_invites WHERE email=_e AND status='pending' LOOP
    BEGIN
      INSERT INTO startup_team_members(startup_id, member_user_id, added_by, role_type)
      SELECT r.startup_id, NEW.user_id, r.invited_by, r.role_type
      WHERE NOT EXISTS (SELECT 1 FROM startup_team_members WHERE startup_id=r.startup_id AND member_user_id=NEW.user_id);
      UPDATE startup_team_invites SET status='accepted', accepted_at=now() WHERE id=r.id;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.claim_startup_team_invites() FROM public, anon, authenticated;
CREATE TRIGGER trg_claim_startup_team_invites AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_startup_team_invites();