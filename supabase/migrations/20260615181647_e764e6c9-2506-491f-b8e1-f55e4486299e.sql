
-- Drop the recursive policy
DROP POLICY IF EXISTS "collaborators can view entities" ON public.declaration_entities;

-- Security-definer helper: does the current user collaborate on this entity?
CREATE OR REPLACE FUNCTION public.is_declaration_entity_collaborator(_entity_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.declaration_entity_collaborators c
    JOIN auth.users u ON lower(u.email) = lower(c.collaborator_email)
    WHERE c.entity_id = _entity_id AND u.id = _user_id
  );
$$;

-- Re-create the policy using the helper (no recursion)
CREATE POLICY "collaborators can view entities"
  ON public.declaration_entities FOR SELECT
  USING (public.is_declaration_entity_collaborator(id, auth.uid()));
