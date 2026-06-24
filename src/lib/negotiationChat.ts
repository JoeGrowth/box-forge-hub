import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure a chat_conversations row exists for this application.
 * Only the initiator can create it (per RLS).
 */
export async function ensureChatConversation(params: {
  applicationId: string;
  initiatorId: string;
  applicantId: string;
  startupId: string;
}): Promise<string | null> {
  const { applicationId, initiatorId, applicantId, startupId } = params;
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert({
      application_id: applicationId,
      initiator_id: initiatorId,
      applicant_id: applicantId,
      startup_id: startupId,
    })
    .select("id")
    .single();
  if (error) {
    console.error("ensureChatConversation failed", error);
    return null;
  }
  return created.id;
}

/**
 * Post a system-style message into the application chat so the negotiation
 * surfaces in the Messages inbox for both sides.
 */
export async function postNegotiationSystemMessage(params: {
  conversationId: string;
  senderId: string;
  content: string;
}) {
  const { conversationId, senderId, content } = params;
  const { error } = await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });
  if (error) console.error("postNegotiationSystemMessage failed", error);
}
