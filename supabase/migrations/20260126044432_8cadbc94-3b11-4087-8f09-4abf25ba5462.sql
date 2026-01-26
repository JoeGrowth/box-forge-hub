-- Create direct_conversations table for 1:1 chats between co-builders
CREATE TABLE public.direct_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_one_id UUID NOT NULL,
  participant_two_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_one_id, participant_two_id)
);

-- Create direct_messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for direct_conversations
CREATE POLICY "Participants can view their conversations"
ON public.direct_conversations
FOR SELECT
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

CREATE POLICY "Approved co-builders can create conversations"
ON public.direct_conversations
FOR INSERT
WITH CHECK (
  (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)
  AND is_approved_cobuilder(auth.uid())
);

CREATE POLICY "Participants can update their conversations"
ON public.direct_conversations
FOR UPDATE
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

-- RLS policies for direct_messages
CREATE POLICY "Participants can view messages in their conversations"
ON public.direct_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversations
    WHERE id = direct_messages.conversation_id
    AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.direct_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.direct_conversations
    WHERE id = direct_messages.conversation_id
    AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON public.direct_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversations
    WHERE id = direct_messages.conversation_id
    AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_direct_conversations_updated_at
  BEFORE UPDATE ON public.direct_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;