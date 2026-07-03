
DO $$ BEGIN
  CREATE TYPE public.org_lifecycle_stage AS ENUM ('venture','business','startup','mature');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_stage public.org_lifecycle_stage NOT NULL DEFAULT 'venture';

CREATE OR REPLACE FUNCTION public.auto_upgrade_org_to_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.client_paid = true AND COALESCE(NEW.budget, 0) > 0 THEN
    SELECT organization_id INTO v_org
      FROM public.declaration_entities
     WHERE id = NEW.entity_id;
    IF v_org IS NOT NULL THEN
      UPDATE public.organizations
         SET lifecycle_stage = 'business'
       WHERE id = v_org
         AND lifecycle_stage = 'venture';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_upgrade_org_business ON public.declaration_missions;
CREATE TRIGGER trg_auto_upgrade_org_business
AFTER INSERT OR UPDATE OF client_paid, budget ON public.declaration_missions
FOR EACH ROW EXECUTE FUNCTION public.auto_upgrade_org_to_business();

UPDATE public.organizations o
   SET lifecycle_stage = 'business'
  WHERE lifecycle_stage = 'venture'
    AND EXISTS (
      SELECT 1 FROM public.declaration_missions m
      JOIN public.declaration_entities e ON e.id = m.entity_id
      WHERE e.organization_id = o.id AND m.client_paid = true AND COALESCE(m.budget,0) > 0
    );

CREATE TABLE IF NOT EXISTS public.organization_legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_legal_documents TO authenticated;
GRANT ALL ON public.organization_legal_documents TO service_role;

ALTER TABLE public.organization_legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org legal docs"
ON public.organization_legal_documents FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
   WHERE m.organization_id = organization_legal_documents.organization_id
     AND m.user_id = auth.uid()
));

CREATE POLICY "Editors+admins can insert org legal docs"
ON public.organization_legal_documents FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.organization_members m
   WHERE m.organization_id = organization_legal_documents.organization_id
     AND m.user_id = auth.uid()
     AND m.role IN ('editor','admin')
) AND uploaded_by = auth.uid());

CREATE POLICY "Editors+admins can update org legal docs"
ON public.organization_legal_documents FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
   WHERE m.organization_id = organization_legal_documents.organization_id
     AND m.user_id = auth.uid()
     AND m.role IN ('editor','admin')
));

CREATE POLICY "Editors+admins can delete org legal docs"
ON public.organization_legal_documents FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
   WHERE m.organization_id = organization_legal_documents.organization_id
     AND m.user_id = auth.uid()
     AND m.role IN ('editor','admin')
));

CREATE TRIGGER trg_org_legal_docs_updated_at
BEFORE UPDATE ON public.organization_legal_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Org members can read legal files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-legal' AND EXISTS (
    SELECT 1 FROM public.organization_members m
     WHERE m.user_id = auth.uid()
       AND m.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Org editors can upload legal files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-legal' AND EXISTS (
    SELECT 1 FROM public.organization_members m
     WHERE m.user_id = auth.uid()
       AND m.organization_id::text = (storage.foldername(name))[1]
       AND m.role IN ('editor','admin')
  )
);

CREATE POLICY "Org editors can update legal files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-legal' AND EXISTS (
    SELECT 1 FROM public.organization_members m
     WHERE m.user_id = auth.uid()
       AND m.organization_id::text = (storage.foldername(name))[1]
       AND m.role IN ('editor','admin')
  )
);

CREATE POLICY "Org editors can delete legal files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-legal' AND EXISTS (
    SELECT 1 FROM public.organization_members m
     WHERE m.user_id = auth.uid()
       AND m.organization_id::text = (storage.foldername(name))[1]
       AND m.role IN ('editor','admin')
  )
);
