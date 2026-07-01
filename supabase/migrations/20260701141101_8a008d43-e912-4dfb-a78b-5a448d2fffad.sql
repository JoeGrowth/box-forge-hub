
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;

CREATE POLICY "chat-attachments owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "chat-attachments owner or participant read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversations cc ON cc.id = cm.conversation_id
      WHERE cm.file_url LIKE '%' || storage.objects.name
        AND (cc.initiator_id = auth.uid() OR cc.applicant_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.direct_conversations dc ON dc.id = dm.conversation_id
      WHERE dm.file_url LIKE '%' || storage.objects.name
        AND (dc.participant_one_id = auth.uid() OR dc.participant_two_id = auth.uid())
    )
  )
);
