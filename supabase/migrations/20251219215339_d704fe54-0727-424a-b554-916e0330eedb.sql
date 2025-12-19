-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.startup_applications(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversations
CREATE POLICY "Participants can view their conversations"
ON public.chat_conversations FOR SELECT
USING (auth.uid() = initiator_id OR auth.uid() = applicant_id);

CREATE POLICY "Initiators can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update their conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = initiator_id OR auth.uid() = applicant_id);

-- RLS policies for chat_messages
CREATE POLICY "Participants can view messages in their conversations"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.initiator_id = auth.uid() OR chat_conversations.applicant_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.initiator_id = auth.uid() OR chat_conversations.applicant_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Fix user_notifications RLS to allow inserting notifications for application_received
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;

CREATE POLICY "Users can insert notifications for others"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for performance
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX idx_chat_conversations_participants ON public.chat_conversations(initiator_id, applicant_id);