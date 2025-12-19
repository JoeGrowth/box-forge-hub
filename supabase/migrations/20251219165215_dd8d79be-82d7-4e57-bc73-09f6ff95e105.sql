-- Create storage bucket for journey documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('journey-documents', 'journey-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for journey documents bucket
CREATE POLICY "Users can upload their own journey documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'journey-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own journey documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'journey-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own journey documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'journey-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all journey documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'journey-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);