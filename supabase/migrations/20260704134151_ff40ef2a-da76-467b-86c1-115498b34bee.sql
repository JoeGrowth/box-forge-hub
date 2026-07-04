
-- 1. Fix ownership_edges: owner or admin only
DROP POLICY IF EXISTS "ownership_edges readable to authenticated" ON public.ownership_edges;
CREATE POLICY "ownership_edges owner or admin read"
  ON public.ownership_edges FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix verified_affiliations: owner or admin only
DROP POLICY IF EXISTS "verified_affiliations readable to authenticated" ON public.verified_affiliations;
CREATE POLICY "verified_affiliations owner or admin read"
  ON public.verified_affiliations FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix user_certifications: owner or admin only
DROP POLICY IF EXISTS "Authenticated users can view certifications" ON public.user_certifications;
CREATE POLICY "Users can view their own certifications"
  ON public.user_certifications FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix public bucket listing: restrict SELECT to owner folder; direct public URL downloads still work
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Users list own avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public can view mask logos" ON storage.objects;
CREATE POLICY "Users list own mask logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mask-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Revoke default EXECUTE from anon and authenticated on all public SECURITY DEFINER functions,
--    then grant back only the ones used by client RPC calls or referenced in RLS policies.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   fn.proname, fn.args);
  END LOOP;
END $$;

-- Allowlist: helpers used inside RLS policies (must be callable by anon+authenticated)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, app_org_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_cobuilder(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_declaration_entity_collaborator(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_entity_admin(text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_plan_shared_with_me(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_entity(text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.declaration_entity_access(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO anon, authenticated;

-- Allowlist: RPC functions invoked from client code (authenticated only)
GRANT EXECUTE ON FUNCTION public.accept_entity_role_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_experience_validation(uuid, graph_edge_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_entrepreneurial_layer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_advisors_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_user_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_entity_role_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_growth_loops(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_notifications_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_beta_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_beta_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_box_feed(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ops_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_relationship_timeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_review() TO authenticated;
GRANT EXECUTE ON FUNCTION public.graph_upsert_edge(uuid, uuid, graph_edge_type, numeric, jsonb, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.graph_upsert_node(graph_node_type, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.legacy_expertise_calc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_box_advisors_public(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.match_advisors_for_request(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_profile_draft(text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_expertise(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_expertise_confidence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_intent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_opportunity_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_ownership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_progression(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_reputation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_revenue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_role_affinity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_trust(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome(uuid, text, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_entity_role_link(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_entity_role_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_lifecycle_integrity_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_cold_start_expertise(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_box_request(uuid, text, uuid, jsonb) TO authenticated;
