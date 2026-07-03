DROP INDEX IF EXISTS public.era_unique_active_user_per_entity;
CREATE UNIQUE INDEX era_unique_active_user_per_entity_role
  ON public.entity_role_assignments (entity_type, entity_id, linked_user_id, role_slug)
  WHERE status = 'accepted' AND linked_user_id IS NOT NULL;