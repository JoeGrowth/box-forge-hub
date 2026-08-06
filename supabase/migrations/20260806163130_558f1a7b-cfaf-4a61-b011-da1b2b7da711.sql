DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
CREATE POLICY "Participants can update messages in their conversations"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
    AND (c.initiator_id = auth.uid() OR c.applicant_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
    AND (c.initiator_id = auth.uid() OR c.applicant_id = auth.uid())
));