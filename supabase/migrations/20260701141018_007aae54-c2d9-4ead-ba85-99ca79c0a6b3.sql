
ALTER FUNCTION public.derived_equity_role(numeric) SET search_path = public;
ALTER FUNCTION public.opportunity_lifecycle_rank(text) SET search_path = public;
ALTER FUNCTION public.slugify_text(text) SET search_path = public;
ALTER FUNCTION public.unique_org_slug(text) SET search_path = public;

ALTER VIEW public.activity_stream SET (security_invoker = true);
ALTER VIEW public.system_alerts SET (security_invoker = true);
ALTER VIEW public.funnel_progress SET (security_invoker = true);
ALTER VIEW public.box_beta_readiness SET (security_invoker = true);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', r.sig);
  END LOOP;
END $$;

DO $$
DECLARE fn text; r record;
  fns text[] := ARRAY[
    'apply_experience_validation','can_access_entrepreneurial_layer','can_view_advisors_directory',
    'compute_user_state','compute_user_state_scores','current_user_email','declaration_entity_access',
    'dispatch_growth_loops','dispatch_notifications_for_event','get_admin_beta_health','get_beta_readiness',
    'get_box_activity','get_box_feed','get_event_audit','get_global_activity','get_ops_metrics',
    'get_profile_activity','get_relationship_timeline','get_system_alerts','get_weekly_review',
    'graph_upsert_edge','graph_upsert_node','has_org_role','has_role','is_approved_cobuilder',
    'is_declaration_entity_collaborator','is_org_member','is_plan_shared_with_me','legacy_expertise_calc',
    'list_box_advisors_public','match_advisors_for_request','promote_profile_draft',
    'recompute_advisor_metrics','recompute_advisor_readiness','recompute_expertise',
    'recompute_expertise_confidence','recompute_intent','recompute_opportunity_matches',
    'recompute_ownership','recompute_progression','recompute_reputation','recompute_revenue',
    'recompute_role_affinity','recompute_trust','record_recommendation_outcome',
    'run_lifecycle_integrity_checks','seed_cold_start_expertise','transition_box_request',
    'pick_growth_loop_variant','run_beta_simulation','audit_graph_integrity',
    'grant_box_role','derive_professional_state','refresh_relationship_health'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    FOR r IN
      SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', r.sig);
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authed read metrics" ON public.advisor_metrics;
CREATE POLICY "advisor_metrics owner or admin read" ON public.advisor_metrics
  FOR SELECT TO authenticated
  USING (advisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authed read readiness" ON public.advisor_readiness;
CREATE POLICY "advisor_readiness owner or admin read" ON public.advisor_readiness
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Contributions visible to authenticated" ON public.contributions;
CREATE POLICY "contributions owner or admin read" ON public.contributions
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone authed reads evidence" ON public.evidence;
CREATE POLICY "evidence owner or admin read" ON public.evidence
  FOR SELECT TO authenticated
  USING (
    captured_by = auth.uid()
    OR (entity_type = 'person' AND entity_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can read expertise projections" ON public.expertise_graph;
CREATE POLICY "expertise_graph owner or admin read" ON public.expertise_graph
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read graph edges" ON public.graph_edges;
CREATE POLICY "graph_edges admin read" ON public.graph_edges
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read graph nodes" ON public.graph_nodes;
CREATE POLICY "graph_nodes admin or own person read" ON public.graph_nodes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (node_type::text = 'person' AND external_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Canvas readable by authenticated" ON public.idea_solution_canvas;
CREATE POLICY "canvas creator team or admin read" ON public.idea_solution_canvas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.startup_ideas i WHERE i.id = idea_solution_canvas.idea_id AND i.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.startup_team_members tm WHERE tm.startup_id = idea_solution_canvas.idea_id AND tm.member_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Milestones visible to authenticated" ON public.milestones;
CREATE POLICY "milestones owner or admin read" ON public.milestones
  FOR SELECT TO authenticated
  USING (
    achieved_by = auth.uid()
    OR (entity_type = 'person' AND entity_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "og_select_all_auth" ON public.ownership_graph;
CREATE POLICY "og_owner_read" ON public.ownership_graph
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "rep_select_all_auth" ON public.reputation_graph;
CREATE POLICY "rep_owner_read" ON public.reputation_graph
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "trust_graph readable by authenticated" ON public.trust_graph;
CREATE POLICY "trust_graph owner or admin read" ON public.trust_graph
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can log clicks" ON public.click_events;
CREATE POLICY "click_events self insert" ON public.click_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
