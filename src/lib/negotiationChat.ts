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

/**
 * Reconciliation: mark every unread message in a conversation as read for the
 * current viewer. Use whenever a user opens the surface that displays the
 * conversation (chat page, negotiation dialog, etc.) so the bell badge and
 * thread state stay in sync.
 */
export async function markConversationRead(params: {
  conversationId: string;
  viewerId: string;
}) {
  const { conversationId, viewerId } = params;
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", viewerId);
  if (error) console.error("markConversationRead failed", error);
}

/**
 * Reconciliation by application id: resolves the conversation row for the
 * application and marks all unread messages as read for the viewer.
 */
export async function markApplicationConversationRead(params: {
  applicationId: string;
  viewerId: string;
}) {
  const { applicationId, viewerId } = params;
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (!conv?.id) return;
  await markConversationRead({ conversationId: conv.id, viewerId });
}

/**
 * Reconciliation for direct conversations.
 */
export async function markDirectConversationRead(params: {
  conversationId: string;
  viewerId: string;
}) {
  const { conversationId, viewerId } = params;
  const { error } = await supabase
    .from("direct_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", viewerId);
  if (error) console.error("markDirectConversationRead failed", error);
}

