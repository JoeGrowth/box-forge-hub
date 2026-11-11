DROP POLICY IF EXISTS "Anyone authenticated can view organization logos" ON storage.objects;
CREATE POLICY "Users can view logos of organizations they can see" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(objects.name))[1]
      AND (o.is_public OR o.created_by = auth.uid() OR public.is_org_member(auth.uid(), o.id) OR public.has_role(auth.uid(), 'admin'))
  )
);