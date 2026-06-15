DROP POLICY IF EXISTS "collaborator can read own row" ON public.declaration_entity_collaborators;
CREATE POLICY "collaborator can read own row" ON public.declaration_entity_collaborators
FOR SELECT USING (lower(collaborator_email) = public.current_user_email());