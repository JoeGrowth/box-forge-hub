
-- Add file columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN file_url TEXT DEFAULT NULL,
ADD COLUMN file_name TEXT DEFAULT NULL,
ADD COLUMN file_type TEXT DEFAULT NULL;

-- Add file columns to direct_messages
ALTER TABLE public.direct_messages
ADD COLUMN file_url TEXT DEFAULT NULL,
ADD COLUMN file_name TEXT DEFAULT NULL,
ADD COLUMN file_type TEXT DEFAULT NULL;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to chat-attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view chat attachments (public bucket)
CREATE POLICY "Chat attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
