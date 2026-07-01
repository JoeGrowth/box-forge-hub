
REVOKE EXECUTE ON FUNCTION public.is_entity_admin(TEXT,UUID,UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_entity(TEXT,UUID,UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_role_catalog(TEXT,TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_role_policy(TEXT,TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_declaration_role_slots(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_entity_role_link(UUID,UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_entity_role_link(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_entity_role_link(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_entity_role_link(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_owner_equity_sum() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_declaration_entity_created() FROM PUBLIC, anon;
