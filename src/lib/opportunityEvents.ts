// Behavioral telemetry → graph events.
// Bridges UI interactions into the graph OS so Growth Loops, Reputation,
// and persona refinement get a complete behavior stream.
//
// IMPORTANT: idempotency keys are bucketed (daily for view/save) so we never
// over-emit while still capturing repeat engagement signal across days.

import { supabase } from "@/integrations/supabase/client";

export type OpportunityEventType =
  | "user_viewed_opportunity"
  | "user_saved_opportunity"
  | "user_applied_opportunity";

const dayBucket = (d = new Date()) => d.toISOString().slice(0, 10);

function buildKey(type: OpportunityEventType, userId: string, opportunityId: string) {
  switch (type) {
    case "user_applied_opportunity":
      // Single-shot: one application per opportunity per user.
      return `${type}:v1:${userId}:${opportunityId}`;
    case "user_saved_opportunity":
    case "user_viewed_opportunity":
      // Day-bucketed: one signal per user/opp/day. Prevents spam, keeps repeat-day signal.
      return `${type}:v1:${userId}:${opportunityId}:${dayBucket()}`;
  }
}

export async function emitOpportunityEvent(
  type: OpportunityEventType,
  args: {
    userId: string;
    opportunityId: string;
    category: string;
    extra?: Record<string, unknown>;
  }
): Promise<void> {
  const { userId, opportunityId, category, extra } = args;
  if (!userId || !opportunityId) return;
  try {
    await supabase.from("graph_events").insert({
      user_id: userId,
      event_type: type,
      event_version: 1,
      aggregate_type: "opportunity",
      aggregate_id: opportunityId,
      source_module: "opportunities_ui",
      idempotency_key: buildKey(type, userId, opportunityId),
      payload: { category, ...(extra ?? {}) } as never,
      weight: type === "user_applied_opportunity" ? 3 : type === "user_saved_opportunity" ? 1 : 0.2,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // Idempotency collisions are expected and silent. Other failures are
    // non-fatal — UI must never block on telemetry.
  }
}

