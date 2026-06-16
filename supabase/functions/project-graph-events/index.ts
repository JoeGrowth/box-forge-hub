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
  | "training_delivered" | "training_published"
  | "consulting_engagement_completed" | "consulting_service_published"
  | "tender_won" | "tender_published"
  | "venture_created" | "equity_vested"
  | "journey_completed" | "job_published" | "job_applied";

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
    } catch (e) {
      failed++;
      await supabase
        .from("graph_events")
        .update({ processing_error: String((e as Error).message ?? e) })
        .eq("id", ev.id);
    }
  }

  // recompute expertise projection for every affected user
  for (const uid of affectedUsers) {
    await supabase.rpc("recompute_expertise", { _user_id: uid });
  }

  return new Response(
    JSON.stringify({ processed, failed, recomputed_users: affectedUsers.size }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
