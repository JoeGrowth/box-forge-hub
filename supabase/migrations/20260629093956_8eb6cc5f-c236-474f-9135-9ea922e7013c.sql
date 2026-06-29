
-- Merge duplicate organizations (case-insensitive name) and enforce uniqueness

DO $$
DECLARE
  grp record;
  keep_id uuid;
  dup_id uuid;
BEGIN
  FOR grp IN
    SELECT lower(name) AS lname, array_agg(id ORDER BY created_at) AS ids
    FROM public.organizations
    GROUP BY lower(name)
    HAVING count(*) > 1
  LOOP
    keep_id := grp.ids[1];
    FOREACH dup_id IN ARRAY grp.ids[2:] LOOP
      -- Repoint child rows
      UPDATE public.declaration_entities SET organization_id = keep_id WHERE organization_id = dup_id;
      UPDATE public.job_opportunities    SET organization_id = keep_id WHERE organization_id = dup_id;
      UPDATE public.tenders              SET organization_id = keep_id WHERE organization_id = dup_id;

      -- Merge members, skipping ones that would collide
      UPDATE public.organization_members m
      SET organization_id = keep_id
      WHERE organization_id = dup_id
        AND NOT EXISTS (
          SELECT 1 FROM public.organization_members k
          WHERE k.organization_id = keep_id AND k.user_id = m.user_id
        );
      DELETE FROM public.organization_members WHERE organization_id = dup_id;

      DELETE FROM public.organizations WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- Merge duplicate declaration_entities by lower(name)
DO $$
DECLARE
  grp record;
  keep_id uuid;
  dup_id uuid;
BEGIN
  FOR grp IN
    SELECT lower(name) AS lname, array_agg(id ORDER BY created_at) AS ids
    FROM public.declaration_entities
    GROUP BY lower(name)
    HAVING count(*) > 1
  LOOP
    keep_id := grp.ids[1];
    FOREACH dup_id IN ARRAY grp.ids[2:] LOOP
      UPDATE public.declaration_missions SET entity_id = keep_id WHERE entity_id = dup_id;
      UPDATE public.declaration_entity_collaborators c
      SET entity_id = keep_id
      WHERE entity_id = dup_id
        AND NOT EXISTS (
          SELECT 1 FROM public.declaration_entity_collaborators k
          WHERE k.entity_id = keep_id AND k.user_id = c.user_id
        );
      DELETE FROM public.declaration_entity_collaborators WHERE entity_id = dup_id;
      DELETE FROM public.declaration_entities WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- Enforce uniqueness (case-insensitive) going forward
CREATE UNIQUE INDEX IF NOT EXISTS organizations_name_lower_unique
  ON public.organizations (lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS declaration_entities_name_lower_unique
  ON public.declaration_entities (lower(name));
