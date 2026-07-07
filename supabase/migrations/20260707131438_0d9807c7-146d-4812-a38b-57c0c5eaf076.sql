
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;

CREATE POLICY "Anyone authenticated can view organization logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'organization-logos');

CREATE POLICY "Org admins/editors can upload organization logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id::text = (storage.foldername(name))[1]
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
);

CREATE POLICY "Org admins/editors can update organization logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id::text = (storage.foldername(name))[1]
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
);

CREATE POLICY "Org admins/editors can delete organization logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id::text = (storage.foldername(name))[1]
      AND m.user_id = auth.uid()
      AND m.role IN ('admin','editor')
  )
);
