import { supabase } from "@/integrations/supabase/client";

export type BoxRequestType =
  | "solution_signoff"
  | "mentorship"
  | "dispute"
  | "partnership"
  | "hiring"
  | "fundraising"
  | "technical_review";

export interface CreateBoxRequestInput {
  request_type: BoxRequestType;
  topic: string;
  context?: string;
  box_id?: string | null;
  subject_entity_type?: string | null;
  subject_entity_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createBoxRequest(input: CreateBoxRequestInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await (supabase as any)
    .from("box_inbound_requests")
    .insert({
      requester_id: user.id,
      request_type: input.request_type,
      topic: input.topic,
      context: input.context ?? null,
      box_id: input.box_id ?? null,
      subject_entity_type: input.subject_entity_type ?? null,
      subject_entity_id: input.subject_entity_id ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) {
    const msg = error.message || "";
    if (msg.includes("rate_limit_exceeded")) {
      throw new Error("You've sent too many advisor requests in the last hour. Please try again later.");
    }
    if (msg.includes("cooldown_active")) {
      throw new Error("You just sent a similar request. Please wait 10 minutes before sending another.");
    }
    throw error;
  }
  return data;
}

export async function rankAdvisors(requestId: string, limit = 5) {
  const { data, error } = await (supabase as any).rpc("match_advisors_for_request", {
    _request_id: requestId,
    _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as Array<{
    advisor_id: string;
    box_id: string;
    match_score: number;
    current_load: number;
    capacity: number;
    reputation_score: number;
    median_response_seconds: number | null;
  }>;
}

export async function transitionRequest(
  requestId: string,
  newStatus: "matched" | "accepted" | "completed" | "archived",
  advisorId?: string,
  meta: Record<string, unknown> = {}
) {
  const { error } = await (supabase as any).rpc("transition_box_request", {
    _request_id: requestId,
    _new_status: newStatus,
    _advisor: advisorId ?? null,
    _meta: meta,
  });
  if (error) throw error;
}
