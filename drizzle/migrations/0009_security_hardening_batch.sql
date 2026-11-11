-- Worker secret (private schema, not exposed)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.worker_secrets (name text PRIMARY KEY, value text NOT NULL);
INSERT INTO private.worker_secrets(name, value)
VALUES ('graph_events_worker', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_worker_secret(_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM private.worker_secrets WHERE name = 'graph_events_worker' AND value = _secret)
$$;
REVOKE ALL ON FUNCTION public.verify_worker_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_worker_secret(text) TO service_role;

DO $$
DECLARE jid bigint; sec text;
BEGIN
  SELECT value INTO sec FROM private.worker_secrets WHERE name = 'graph_events_worker';
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'graph-events-worker-every-minute';
  IF jid IS NOT NULL THEN
    PERFORM cron.alter_job(jid, command := format($cmd$
  SELECT net.http_post(
    url:='https://kdksqsviaxajspjffmsc.supabase.co/functions/v1/project-graph-events',
    headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',%L),
    body:=jsonb_build_object('scheduled_at', now())
  );$cmd$, sec));
  END IF;
END $$;

-- onboarding_state.user_status: only admins / privileged server code may change it
CREATE OR REPLACE FUNCTION public.guard_onboarding_user_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.user_status := 'applied';
    ELSIF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
      NEW.user_status := OLD.user_status;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_onboarding_user_status ON public.onboarding_state;
CREATE TRIGGER guard_onboarding_user_status BEFORE INSERT OR UPDATE ON public.onboarding_state
FOR EACH ROW EXECUTE FUNCTION public.guard_onboarding_user_status();

-- Tighten tautological read policies
DROP POLICY IF EXISTS "weights readable by all" ON public.opportunity_weights;
CREATE POLICY "weights readable by admin" ON public.opportunity_weights FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "growth_loop_experiments readable" ON public.growth_loop_experiments;

DROP POLICY IF EXISTS "growth_loops readable by authenticated" ON public.growth_loops;
CREATE POLICY "growth_loops readable for own runs" ON public.growth_loops FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.growth_loop_runs r WHERE r.loop_key = growth_loops.loop_key AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "principals_read_auth" ON public.platform_principals;
CREATE POLICY "principals_read_admin" ON public.platform_principals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view portfolio entities" ON public.portfolio_entities;
CREATE POLICY "Owners can view portfolio entities" ON public.portfolio_entities FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "orgs_select_all_authenticated" ON public.organizations;
CREATE POLICY "orgs_select_visible" ON public.organizations FOR SELECT TO authenticated
USING (is_public OR created_by = auth.uid() OR public.is_org_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));