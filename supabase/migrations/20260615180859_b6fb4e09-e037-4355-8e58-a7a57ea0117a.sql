
CREATE TABLE public.declaration_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.declaration_entities TO authenticated;
GRANT ALL ON public.declaration_entities TO service_role;
ALTER TABLE public.declaration_entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.declaration_entity_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.declaration_entities(id) ON DELETE CASCADE,
  collaborator_email text NOT NULL,
  access text NOT NULL CHECK (access IN ('view','edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, collaborator_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.declaration_entity_collaborators TO authenticated;
GRANT ALL ON public.declaration_entity_collaborators TO service_role;
ALTER TABLE public.declaration_entity_collaborators ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.declaration_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.declaration_entities(id) ON DELETE CASCADE,
  client text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'consulting',
  budget numeric NOT NULL DEFAULT 0,
  client_paid boolean NOT NULL DEFAULT false,
  internal jsonb NOT NULL DEFAULT '[]'::jsonb,
  external jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.declaration_missions TO authenticated;
GRANT ALL ON public.declaration_missions TO service_role;
ALTER TABLE public.declaration_missions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.declaration_entity_access(_entity_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.declaration_entities de WHERE de.id = _entity_id AND de.owner_id = _user_id) THEN 'owner'
    WHEN EXISTS (
      SELECT 1 FROM public.declaration_entity_collaborators c
      JOIN auth.users u ON lower(u.email) = lower(c.collaborator_email)
      WHERE c.entity_id = _entity_id AND u.id = _user_id AND c.access = 'edit'
    ) THEN 'edit'
    WHEN EXISTS (
      SELECT 1 FROM public.declaration_entity_collaborators c
      JOIN auth.users u ON lower(u.email) = lower(c.collaborator_email)
      WHERE c.entity_id = _entity_id AND u.id = _user_id AND c.access = 'view'
    ) THEN 'view'
    ELSE NULL
  END;
$$;

CREATE POLICY "owner manages entities"
  ON public.declaration_entities FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "collaborators can view entities"
  ON public.declaration_entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.declaration_entity_collaborators c
      JOIN auth.users u ON lower(u.email) = lower(c.collaborator_email)
      WHERE c.entity_id = public.declaration_entities.id AND u.id = auth.uid()
    )
  );

CREATE POLICY "owner manages collaborators"
  ON public.declaration_entity_collaborators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.declaration_entities e WHERE e.id = entity_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.declaration_entities e WHERE e.id = entity_id AND e.owner_id = auth.uid()));

CREATE POLICY "collaborator can read own row"
  ON public.declaration_entity_collaborators FOR SELECT
  USING (lower(collaborator_email) = (SELECT lower(email) FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "view missions if access"
  ON public.declaration_missions FOR SELECT
  USING (public.declaration_entity_access(entity_id, auth.uid()) IS NOT NULL);

CREATE POLICY "insert missions if owner or edit"
  ON public.declaration_missions FOR INSERT
  WITH CHECK (public.declaration_entity_access(entity_id, auth.uid()) IN ('owner','edit'));

CREATE POLICY "update missions if owner or edit"
  ON public.declaration_missions FOR UPDATE
  USING (public.declaration_entity_access(entity_id, auth.uid()) IN ('owner','edit'))
  WITH CHECK (public.declaration_entity_access(entity_id, auth.uid()) IN ('owner','edit'));

CREATE POLICY "delete missions if owner or edit"
  ON public.declaration_missions FOR DELETE
  USING (public.declaration_entity_access(entity_id, auth.uid()) IN ('owner','edit'));

CREATE TRIGGER trg_declaration_entities_updated BEFORE UPDATE ON public.declaration_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_declaration_missions_updated BEFORE UPDATE ON public.declaration_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
