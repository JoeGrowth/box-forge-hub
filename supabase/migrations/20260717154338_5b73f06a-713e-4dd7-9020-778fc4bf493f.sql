
-- File path convention: {tender_id}/{user_id}/{filename}
CREATE POLICY "Contractors upload own tender files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tender-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Contractors read own tender files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tender-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Contractors delete own tender files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tender-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Org managers read tender files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tender-submissions'
  AND EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND public.has_org_role(auth.uid(), t.organization_id, 'viewer'::app_org_role)
  )
);
