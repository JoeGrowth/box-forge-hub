DROP POLICY IF EXISTS "preds_read_auth" ON public.progression_predicates;
CREATE POLICY "preds_read_admin" ON public.progression_predicates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "rule_preds_read_auth" ON public.progression_rule_predicates;
CREATE POLICY "rule_preds_read_admin" ON public.progression_rule_predicates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "milestones_read_auth" ON public.progression_milestones;
CREATE POLICY "milestones_read_admin" ON public.progression_milestones FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Authenticated can read event catalog" ON public.event_catalog;
CREATE POLICY "Admins can read event catalog" ON public.event_catalog FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "role_policy readable to authenticated" ON public.role_attribution_policy;
DROP POLICY IF EXISTS "partners_read_auth" ON public.platform_partners;
CREATE POLICY "partners_read_active" ON public.platform_partners FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Authenticated can view portfolio products" ON public.portfolio_products;
CREATE POLICY "Owners can view portfolio products" ON public.portfolio_products FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can upload bug screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload bug screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bug-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE OR REPLACE FUNCTION public.get_box_feed(_box_id uuid, _limit integer DEFAULT 50)
 RETURNS TABLE(occurred_at timestamp with time zone, event_type text, user_id uuid, aggregate_type text, aggregate_id text, payload jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT ge.occurred_at, ge.event_type::TEXT, ge.user_id, ge.aggregate_type, ge.aggregate_id, ge.payload
  FROM public.graph_events ge
  WHERE auth.uid() IS NOT NULL
  AND _box_id IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.box_advisors ba WHERE ba.box_id = _box_id AND ba.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.box_ecosystem_admins bea WHERE bea.box_id = _box_id AND bea.user_id = auth.uid())
  )
  AND ge.event_type IN (
    'idea.solution.validated','relationship.formed','commitment.completed',
    'milestone.achieved','contribution.recorded','ritual.instance.completed',
    'startup.team.joined','company.incorporated'
  )
  AND (ge.payload ->> 'box_id')::uuid = _box_id
  ORDER BY ge.occurred_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$function$;
REVOKE EXECUTE ON FUNCTION public.get_box_feed(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_box_feed(uuid, integer) TO authenticated;