
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

REVOKE EXECUTE ON FUNCTION public.recompute_advisor_readiness(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_advisor_metrics(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_advisors_for_request(uuid,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transition_box_request(uuid,text,uuid,jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.recompute_advisor_readiness(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_advisor_metrics(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_advisors_for_request(uuid,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_box_request(uuid,text,uuid,jsonb) TO authenticated, service_role;
