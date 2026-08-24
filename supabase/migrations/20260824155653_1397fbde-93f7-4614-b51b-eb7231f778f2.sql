REVOKE EXECUTE ON FUNCTION public.distribution_entity_org(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.distribution_entity_org(text) TO authenticated, service_role;