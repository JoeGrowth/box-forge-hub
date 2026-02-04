-- Create storage bucket for mask logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mask-logos', 'mask-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload their own mask logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'mask-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update their own mask logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'mask-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete their own mask logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'mask-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to mask logos
CREATE POLICY "Public can view mask logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'mask-logos');