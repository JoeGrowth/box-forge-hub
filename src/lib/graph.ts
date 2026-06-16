// Graph Platform — client-side event emitter.
//
// Contract (Gate 1 + Gate 2):
//   - Every emission MUST declare an event_version. The (event_type, version)
//     pair must exist in the public.event_catalog table. Unknown / deprecated
//     contracts are rejected by a DB trigger.
//   - Every emission MUST supply an idempotency_key. Duplicate keys are
//     silently absorbed (unique index). Replays and double-delivery never
//     create duplicate edges.
//
// Modules MUST NOT read graph projections through this file — use
// hooks/useExpertise() for that.

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
  eventVersion: number;          // REQUIRED — Gate 1
  aggregateType: string;
  aggregateId: string;
  sourceModule: string;
  idempotencyKey: string;        // REQUIRED — Gate 2
  payload?: Record<string, unknown>;
  weight?: number;
  occurredAt?: string;
}

/**
 * Build a canonical idempotency key. Use this everywhere so the same logical
 * action produces the same key from any caller.
 * Convention: "<event_type>:v<version>:<user_id>:<aggregate_id>[:<discriminator>]"
 */
export function idemKey(
  eventType: GraphEventType,
  version: number,
  userId: string,
  aggregateId: string,
  discriminator?: string,
): string {
  return [eventType, `v${version}`, userId, aggregateId, discriminator]
    .filter(Boolean)
    .join(":");
}

/**
 * Fire-and-forget. Never throws into the caller's flow.
 * Duplicate idempotency_key returns gracefully (treated as success).
 */
export async function emitGraphEvent(input: EmitGraphEventInput): Promise<void> {
  try {
    const { error } = await supabase.from("graph_events").insert([{
      user_id: input.userId,
      event_type: input.eventType,
      event_version: input.eventVersion,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      source_module: input.sourceModule,
      idempotency_key: input.idempotencyKey,
      payload: (input.payload ?? {}) as never,
      weight: input.weight ?? 1,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    }]);
    if (error) {
      // 23505 unique_violation on idempotency_key is expected and benign.
      if ((error as { code?: string }).code === "23505") return;
      // eslint-disable-next-line no-console
      console.warn("[graph] emit failed:", error.message, input);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[graph] emit threw:", e);
  }
}
