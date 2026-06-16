// Graph Platform — client-side event emitter.
//
// Every module that mutates user expertise/trust/ownership data should call
// emitGraphEvent() at the existing write site. One-line addition. The async
// worker (project-graph-events) consumes these events and materializes
// graph_nodes / graph_edges / expertise_graph.
//
// DO NOT read graph projections through this file — use hooks like
// useExpertise() for that. This file only writes events.

import { supabase } from "@/integrations/supabase/client";

export type GraphEventType =
  | "skill_added"
  | "skill_removed"
  | "certification_earned"
  | "certification_verified"
  | "startup_contribution_accepted"
  | "startup_member_added"
  | "training_delivered"
  | "training_published"
  | "consulting_engagement_completed"
  | "consulting_service_published"
  | "tender_won"
  | "tender_published"
  | "venture_created"
  | "equity_vested"
  | "journey_completed"
  | "job_published"
  | "job_applied";

export interface EmitGraphEventInput {
  userId: string;
  eventType: GraphEventType;
  aggregateType: string;   // e.g. "skill", "certification", "startup"
  aggregateId: string;     // stable external id of the "to" entity
  sourceModule: string;    // e.g. "profile.skills", "learning.journey", "scale.team"
  payload?: Record<string, unknown>;
  weight?: number;
  occurredAt?: string;     // ISO; defaults to now
}

/**
 * Fire-and-forget. Never throws into the caller's flow — graph emission
 * must not break a user's primary action. Errors are logged.
 */
export async function emitGraphEvent(input: EmitGraphEventInput): Promise<void> {
  try {
    const { error } = await supabase.from("graph_events").insert([{
      user_id: input.userId,
      event_type: input.eventType,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      source_module: input.sourceModule,
      payload: input.payload ?? {},
      weight: input.weight ?? 1,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    }]);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[graph] emit failed:", error.message, input);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[graph] emit threw:", e);
  }
}
