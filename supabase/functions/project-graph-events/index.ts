// Async projection worker for the Graph Platform.
// Reads unprocessed graph_events, materializes graph_nodes + graph_edges,
// then recomputes the expertise_graph projection for affected users.
//
// Invoked by: pg_cron (every minute) or manual fetch.
// Idempotent: each event is marked processed_at after success; failures
// write processing_error and remain unprocessed for retry (dead-letter).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventType =
  | "skill_added" | "skill_removed"
  | "certification_earned" | "certification_verified"
  | "startup_contribution_accepted" | "startup_member_added"
  | "startup_contribution_completed"
  | "training_delivered" | "training_published" | "training_completed"
  | "consulting_engagement_completed" | "consulting_service_published" | "consulting_completed"
  | "tender_won" | "tender_published"
  | "venture_created" | "equity_vested"
  | "journey_completed" | "job_published" | "job_applied" | "job_completed"
  | "review_created" | "transaction_completed" | "milestone_completed"
  // Phase 3 — Opportunity Graph
  | "opportunity_created" | "opportunity_updated" | "opportunity_published" | "opportunity_closed"
  | "user_viewed_opportunity" | "user_saved_opportunity" | "user_applied_opportunity"
  | "user_rejected_opportunity" | "user_accepted_opportunity"
  // Phase 4 — Revenue Graph
  | "transaction_created" | "offer_sent" | "offer_accepted" | "contract_created"
  | "payment_initiated" | "payment_completed" | "payment_failed" | "refund_created"
  | "delivery_started" | "delivery_completed" | "invoice_created";

interface GraphEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  aggregate_type: string;
  aggregate_id: string;
  source_module: string;
  payload: Record<string, unknown>;
  weight: number;
  occurred_at: string;
}

// Map event_type -> (node_type for the "to" side, edge_type, label extractor, attribute extractor)
const EVENT_RULES: Record<EventType, {
  toNodeType: string;
  edgeType: string;
  labelFrom: (p: Record<string, unknown>) => string | null;
  attrsFrom?: (p: Record<string, unknown>) => Record<string, unknown>;
} | null> = {
  skill_added:                     { toNodeType: "skill",              edgeType: "HAS_SKILL",          labelFrom: p => (p.skill_name as string) ?? (p.skill_id as string) ?? null },
  skill_removed:                   null, // handled separately (delete edge)
  certification_earned:            { toNodeType: "certification",      edgeType: "HAS_CERTIFICATION",  labelFrom: p => (p.certification_label as string) ?? (p.certification_type as string) ?? null, attrsFrom: p => ({ verified: p.verified ?? false }) },
  certification_verified:          { toNodeType: "certification",      edgeType: "HAS_CERTIFICATION",  labelFrom: p => (p.certification_label as string) ?? (p.certification_type as string) ?? null, attrsFrom: () => ({ verified: true }) },
  startup_contribution_accepted:   { toNodeType: "startup",            edgeType: "CONTRIBUTED_TO",     labelFrom: p => (p.startup_title as string) ?? null,  attrsFrom: p => ({ role: p.role, equity: p.equity }) },
  startup_member_added:            { toNodeType: "startup",            edgeType: "MEMBER_OF",          labelFrom: p => (p.startup_title as string) ?? null },
  training_delivered:              { toNodeType: "training",           edgeType: "DELIVERED",          labelFrom: p => (p.training_title as string) ?? null },
  training_published:              { toNodeType: "training",           edgeType: "PUBLISHED",          labelFrom: p => (p.training_title as string) ?? null },
  consulting_engagement_completed: { toNodeType: "consulting_service", edgeType: "ENGAGED_IN",         labelFrom: p => (p.service_title as string) ?? null },
  consulting_service_published:    { toNodeType: "consulting_service", edgeType: "PUBLISHED",          labelFrom: p => (p.service_title as string) ?? null },
  tender_won:                      { toNodeType: "tender",             edgeType: "ENGAGED_IN",         labelFrom: p => (p.tender_title as string) ?? null },
  tender_published:                { toNodeType: "tender",             edgeType: "PUBLISHED",          labelFrom: p => (p.tender_title as string) ?? null },
  venture_created:                 { toNodeType: "venture",            edgeType: "CREATED",            labelFrom: p => (p.venture_name as string) ?? null },
  equity_vested:                   { toNodeType: "startup",            edgeType: "OWNS_EQUITY_IN",     labelFrom: p => (p.startup_title as string) ?? null, attrsFrom: p => ({ equity: p.equity, vested_at: p.vested_at }) },
  journey_completed:               { toNodeType: "certification",      edgeType: "COMPLETED",          labelFrom: p => (p.journey_label as string) ?? null },
  job_published:                   { toNodeType: "job",                edgeType: "PUBLISHED",          labelFrom: p => (p.job_title as string) ?? null },
  job_applied:                     { toNodeType: "job",                edgeType: "APPLIED_TO",         labelFrom: p => (p.job_title as string) ?? null },
  // ---------- Trust Graph events (Phase 2) ----------
  // Completion-of-work signals — these prove delivery, not intent.
  startup_contribution_completed:  { toNodeType: "startup",            edgeType: "CONTRIBUTED_TO",     labelFrom: p => (p.startup_title as string) ?? null, attrsFrom: p => ({ completed: true, role: p.role, completed_at: p.completed_at }) },
  training_completed:              { toNodeType: "training",           edgeType: "USER_COMPLETED_PROJECT", labelFrom: p => (p.training_title as string) ?? null, attrsFrom: p => ({ completed_at: p.completed_at }) },
  consulting_completed:            { toNodeType: "consulting_service", edgeType: "USER_DELIVERED_OUTCOME", labelFrom: p => (p.service_title as string) ?? null, attrsFrom: p => ({ completed_at: p.completed_at }) },
  job_completed:                   { toNodeType: "job",                edgeType: "USER_COMPLETED_PROJECT", labelFrom: p => (p.job_title as string) ?? null, attrsFrom: p => ({ completed_at: p.completed_at }) },
  milestone_completed:             { toNodeType: "project",            edgeType: "USER_COMPLETED_PROJECT", labelFrom: p => (p.milestone_title as string) ?? null, attrsFrom: p => ({ completed_at: p.completed_at }) },
  transaction_completed:           { toNodeType: "transaction",        edgeType: "USER_COMPLETED_TRANSACTION", labelFrom: p => (p.transaction_label as string) ?? null, attrsFrom: p => ({ amount: p.amount, counterparty: p.counterparty }) },
  review_created:                  { toNodeType: "review",             edgeType: "USER_RECEIVED_REVIEW", labelFrom: p => (p.review_subject as string) ?? null, attrsFrom: p => ({ rating: p.rating, reviewer_id: p.reviewer_id, context_id: p.context_id }) },
  // ---------- Opportunity Graph events (Phase 3) ----------
  // Lifecycle: materialize the opportunity node + an authorship/state edge.
  opportunity_created:             { toNodeType: "opportunity",        edgeType: "CREATED",                    labelFrom: p => (p.title as string) ?? null, attrsFrom: p => ({ kind: p.opportunity_kind, sector: p.sector }) },
  opportunity_updated:             { toNodeType: "opportunity",        edgeType: "CREATED",                    labelFrom: p => (p.title as string) ?? null, attrsFrom: p => ({ kind: p.opportunity_kind, updated: true }) },
  opportunity_published:           { toNodeType: "opportunity",        edgeType: "PUBLISHED",                  labelFrom: p => (p.title as string) ?? null, attrsFrom: p => ({ kind: p.opportunity_kind }) },
  opportunity_closed:              { toNodeType: "opportunity",        edgeType: "PUBLISHED",                  labelFrom: p => (p.title as string) ?? null, attrsFrom: p => ({ closed: true, reason: p.reason }) },
  // Interaction: signals user intent. Feeds the intent_points dimension.
  user_viewed_opportunity:         { toNodeType: "opportunity",        edgeType: "USER_INTERACTED_WITH_OPPORTUNITY", labelFrom: p => (p.title as string) ?? null, attrsFrom: () => ({ kind: "view" }) },
  user_saved_opportunity:          { toNodeType: "opportunity",        edgeType: "USER_INTERACTED_WITH_OPPORTUNITY", labelFrom: p => (p.title as string) ?? null, attrsFrom: () => ({ kind: "save" }) },
  user_applied_opportunity:        { toNodeType: "opportunity",        edgeType: "APPLIED_TO",                 labelFrom: p => (p.title as string) ?? null, attrsFrom: p => ({ kind: p.opportunity_kind ?? "apply" }) },
  user_rejected_opportunity:       { toNodeType: "opportunity",        edgeType: "USER_INTERACTED_WITH_OPPORTUNITY", labelFrom: p => (p.title as string) ?? null, attrsFrom: () => ({ kind: "reject" }) },
  user_accepted_opportunity:       { toNodeType: "opportunity",        edgeType: "USER_INTERACTED_WITH_OPPORTUNITY", labelFrom: p => (p.title as string) ?? null, attrsFrom: () => ({ kind: "accept" }) },
  // ---------- Revenue Graph events (Phase 4) ----------
  // Economic memory: transactions, contracts, payments, deliveries, invoices.
  // Edges flow user -> transaction/contract/payment/invoice nodes.
  transaction_created:             { toNodeType: "transaction", edgeType: "USER_CREATED_TRANSACTION", labelFrom: p => (p.type as string) ?? (p.transaction_id as string) ?? null, attrsFrom: p => ({ amount: p.amount, currency: p.currency, type: p.type, buyer_id: p.buyer_id, seller_id: p.seller_id, opportunity_id: p.opportunity_id }) },
  offer_sent:                      { toNodeType: "transaction", edgeType: "USER_CREATED_TRANSACTION", labelFrom: p => (p.offer_id as string) ?? null, attrsFrom: p => ({ kind: "offer_sent", amount: p.amount, to_user_id: p.to_user_id }) },
  offer_accepted:                  { toNodeType: "transaction", edgeType: "USER_CREATED_TRANSACTION", labelFrom: p => (p.offer_id as string) ?? null, attrsFrom: p => ({ kind: "offer_accepted", accepted_by: p.accepted_by }) },
  contract_created:                { toNodeType: "contract",    edgeType: "CONTRACT_BETWEEN_PARTIES", labelFrom: p => (p.contract_id as string) ?? null, attrsFrom: p => ({ transaction_id: p.transaction_id, parties: p.parties }) },
  payment_initiated:               { toNodeType: "payment",     edgeType: "USER_PAID_USER", labelFrom: p => (p.payment_id as string) ?? null, attrsFrom: p => ({ status: "initiated", amount: p.amount, transaction_id: p.transaction_id }) },
  payment_completed:               { toNodeType: "payment",     edgeType: "USER_PAID_USER", labelFrom: p => (p.payment_id as string) ?? null, attrsFrom: p => ({ status: "completed", amount: p.amount, transaction_id: p.transaction_id, counterparty: p.counterparty }) },
  payment_failed:                  { toNodeType: "payment",     edgeType: "USER_PAID_USER", labelFrom: p => (p.payment_id as string) ?? null, attrsFrom: p => ({ status: "failed", reason: p.reason }) },
  refund_created:                  { toNodeType: "payment",     edgeType: "USER_PAID_USER", labelFrom: p => (p.refund_id as string) ?? null, attrsFrom: p => ({ status: "refunded", amount: p.amount }) },
  delivery_started:                { toNodeType: "transaction", edgeType: "USER_DELIVERED_VALUE", labelFrom: p => (p.transaction_id as string) ?? null, attrsFrom: () => ({ status: "started" }) },
  delivery_completed:              { toNodeType: "transaction", edgeType: "USER_DELIVERED_VALUE", labelFrom: p => (p.transaction_id as string) ?? null, attrsFrom: p => ({ status: "completed", completed_at: p.completed_at }) },
  invoice_created:                 { toNodeType: "invoice",     edgeType: "USER_RECEIVED_VALUE", labelFrom: p => (p.invoice_id as string) ?? null, attrsFrom: p => ({ amount: p.amount, transaction_id: p.transaction_id }) },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: events, error } = await supabase
    .from("graph_events")
    .select("*")
    .is("processed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const affectedUsers = new Set<string>();
  let processed = 0;
  let failed = 0;

  for (const ev of (events ?? []) as GraphEvent[]) {
    try {
      // ensure user node
      const { data: userNodeId, error: userErr } = await supabase.rpc("graph_upsert_node", {
        _node_type: "user",
        _external_id: ev.user_id,
        _label: null,
        _attributes: {},
      });
      if (userErr) throw userErr;

      const rule = EVENT_RULES[ev.event_type];

      if (ev.event_type === "skill_removed") {
        // delete the matching edge if we can identify the target skill
        const skillKey = (ev.payload.skill_id ?? ev.payload.skill_name) as string | undefined;
        if (skillKey) {
          const { data: targetNode } = await supabase
            .from("graph_nodes")
            .select("id")
            .eq("node_type", "skill")
            .eq("external_id", skillKey)
            .maybeSingle();
          if (targetNode) {
            await supabase
              .from("graph_edges")
              .delete()
              .eq("from_node_id", userNodeId)
              .eq("to_node_id", targetNode.id)
              .eq("edge_type", "HAS_SKILL");
          }
        }
      } else if (rule) {
        const externalId = (ev.aggregate_id || ev.payload.external_id || rule.labelFrom(ev.payload)) as string;
        if (!externalId) throw new Error("missing external_id for to-node");

        const { data: toNodeId, error: toErr } = await supabase.rpc("graph_upsert_node", {
          _node_type: rule.toNodeType,
          _external_id: externalId,
          _label: rule.labelFrom(ev.payload),
          _attributes: rule.attrsFrom ? rule.attrsFrom(ev.payload) : {},
        });
        if (toErr) throw toErr;

        const { error: edgeErr } = await supabase.rpc("graph_upsert_edge", {
          _from: userNodeId,
          _to: toNodeId,
          _edge_type: rule.edgeType,
          _weight: ev.weight ?? 1,
          _attributes: rule.attrsFrom ? rule.attrsFrom(ev.payload) : {},
          _source_event_id: ev.id,
          _occurred_at: ev.occurred_at,
        });
        if (edgeErr) throw edgeErr;
      }

      await supabase
        .from("graph_events")
        .update({ processed_at: new Date().toISOString(), processing_error: null })
        .eq("id", ev.id);

      affectedUsers.add(ev.user_id);
      processed++;

      // Phase 4 — Revenue → Trust feedback loop.
      // Completion-of-economic-activity emits a trust-grade event consumed
      // by the Trust Graph on the next recompute.
      if (ev.event_type === "payment_completed" || ev.event_type === "delivery_completed") {
        const txId = (ev.payload.transaction_id as string) ?? ev.aggregate_id;
        const buyerId = ev.payload.buyer_id as string | undefined;
        const sellerId = ev.payload.seller_id as string | undefined;
        const amount = ev.payload.amount ?? 0;
        const idem = `transaction_completed:v1:${txId}:${ev.event_type}`;
        await supabase.from("graph_events").insert({
          user_id: sellerId ?? ev.user_id,
          event_type: "transaction_completed",
          event_version: 1,
          aggregate_type: "transaction",
          aggregate_id: txId,
          source_module: "revenue",
          idempotency_key: idem,
          payload: { transaction_id: txId, buyer_id: buyerId, seller_id: sellerId, amount, counterparty: buyerId },
          weight: 1,
          occurred_at: ev.occurred_at,
        });
        if (sellerId) affectedUsers.add(sellerId);
        if (buyerId) affectedUsers.add(buyerId);
      }
      failed++;
      const msg = String((e as Error).message ?? e);
      const nextAttempt = (((ev as unknown) as { attempt_count?: number }).attempt_count ?? 0) + 1;
      await supabase
        .from("graph_events")
        .update({ processing_error: msg, attempt_count: nextAttempt })
        .eq("id", ev.id);
      // Escalate to dead-letter queue after 3 failed attempts. Mark
      // processed_at so the worker stops retrying; ops can resolve from DLQ.
      if (nextAttempt >= 3) {
        await supabase.from("graph_dead_letters").upsert({
          event_id: ev.id,
          event_type: ev.event_type,
          user_id: ev.user_id,
          error: msg,
          attempt_count: nextAttempt,
          payload_snapshot: ev.payload as never,
        }, { onConflict: "event_id" });
        await supabase
          .from("graph_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", ev.id);
      }
    }
  }

  // recompute every projection that may depend on the affected user.
  // Phase 1: Expertise. Phase 2: Trust. Phase 3: Opportunity matches.
  // Future projections plug in here with no change to the event spine.
  for (const uid of affectedUsers) {
    await supabase.rpc("recompute_expertise", { _user_id: uid });
    await supabase.rpc("recompute_trust",     { _user_id: uid });
    await supabase.rpc("recompute_opportunity_matches", { _user_id: uid });
  }

  return new Response(
    JSON.stringify({ processed, failed, recomputed_users: affectedUsers.size }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
