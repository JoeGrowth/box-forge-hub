
DROP VIEW IF EXISTS public.admin_beta_health;

CREATE VIEW public.admin_beta_health
WITH (security_invoker = true) AS
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

REVOKE ALL ON public.admin_beta_health FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_beta_health TO authenticated;

-- Hard guard: admin-only RPC for the console (callable from client safely)
CREATE OR REPLACE FUNCTION public.get_admin_beta_health()
RETURNS public.admin_beta_health
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.admin_beta_health;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.admin_beta_health;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.get_admin_beta_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_beta_health() TO authenticated;
