CREATE POLICY "Authenticated users can upload bug screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their own bug screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bug-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all bug screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bug-screenshots'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can delete their own bug screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bug-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );