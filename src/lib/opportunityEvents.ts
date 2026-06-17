// Behavioral telemetry → graph events.
// Bridges UI interactions into the graph OS so Growth Loops, Reputation,
// and persona refinement get a complete behavior stream.
//
// IMPORTANT: idempotency keys are bucketed (daily for view/save) so we never
// over-emit while still capturing repeat engagement signal across days.

import { supabase } from "@/integrations/supabase/client";

export type OpportunityEventType =
  | "opportunity_viewed"
  | "opportunity_saved"
  | "opportunity_applied";

const dayBucket = (d = new Date()) => d.toISOString().slice(0, 10);

function buildKey(type: OpportunityEventType, userId: string, opportunityId: string) {
  switch (type) {
    case "opportunity_applied":
      // Single-shot: one application per opportunity per user.
      return `opportunity_applied:v1:${userId}:${opportunityId}`;
    case "opportunity_saved":
    case "opportunity_viewed":
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
      weight: type === "opportunity_applied" ? 3 : type === "opportunity_saved" ? 1 : 0.2,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // Idempotency collisions are expected and silent. Other failures are
    // non-fatal — UI must never block on telemetry.
  }
}
