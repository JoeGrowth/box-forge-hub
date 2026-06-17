import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Phase 8 — Autonomous Growth Loops.
// Reads the user's growth_loop_runs (notification_engine + conversion
// tracking) and exposes engagement / conversion / dismissal handlers that
// emit events back into the spine. The hook never decides what to recommend;
// it only consumes runs produced by the SQL dispatcher.

export interface GrowthLoopRun {
  id: string;
  loop_key: string;
  status: "triggered" | "notified" | "engaged" | "converted" | "dismissed" | "expired";
  scheduled_for: string;
  notified_at: string | null;
  engaged_at: string | null;
  converted_at: string | null;
  dismissed_at: string | null;
  context: Record<string, unknown>;
  created_at: string;
  loop?: {
    description: string;
    action_kind: string;
    action_payload: Record<string, unknown>;
  };
}

async function emit(
  userId: string,
  type:
    | "growth_loop_engaged"
    | "growth_loop_converted"
    | "growth_loop_dismissed"
    | "recommendation_feedback_recorded",
  payload: Record<string, unknown>,
  aggregateId: string,
) {
  await supabase.from("graph_events").insert({
    user_id: userId,
    event_type: type,
    event_version: 1,
    aggregate_type: type === "recommendation_feedback_recorded" ? "recommendation" : "growth_loop",
    aggregate_id: aggregateId,
    source_module: "growth.loops",
    idempotency_key: `${type}:v1:${aggregateId}:${Date.now()}`,
    payload: payload as never,
    weight: 1,
    occurred_at: new Date().toISOString(),
  });
}

export function useGrowthLoops(userId?: string | null) {
  const [runs, setRuns] = useState<GrowthLoopRun[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Dispatch is idempotent (cooldown-gated); calling on mount keeps the
      // user's loops fresh even if the worker hasn't fired recently.
      await supabase.rpc("dispatch_growth_loops", { _user_id: userId });
      const { data: runRows } = await supabase
        .from("growth_loop_runs")
        .select("id,loop_key,status,scheduled_for,notified_at,engaged_at,converted_at,dismissed_at,context,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const keys = Array.from(new Set((runRows ?? []).map((r) => r.loop_key)));
      const { data: loops } = keys.length
        ? await supabase
            .from("growth_loops")
            .select("loop_key,description,action_kind,action_payload")
            .in("loop_key", keys)
        : { data: [] };
      const byKey = new Map((loops ?? []).map((l) => [l.loop_key, l]));
      setRuns(
        ((runRows ?? []) as unknown as GrowthLoopRun[]).map((r) => ({
          ...r,
          loop: byKey.get(r.loop_key)
            ? {
                description: byKey.get(r.loop_key)!.description as string,
                action_kind: byKey.get(r.loop_key)!.action_kind as string,
                action_payload: (byKey.get(r.loop_key)!.action_payload as Record<string, unknown>) ?? {},
              }
            : undefined,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const engage = useCallback(async (run: GrowthLoopRun) => {
    if (!userId) return;
    await supabase
      .from("growth_loop_runs")
      .update({ status: "engaged", engaged_at: new Date().toISOString() })
      .eq("id", run.id);
    await emit(userId, "growth_loop_engaged", { loop_key: run.loop_key, run_id: run.id }, run.id);
    await refresh();
  }, [userId, refresh]);

  const convert = useCallback(async (run: GrowthLoopRun) => {
    if (!userId) return;
    await supabase
      .from("growth_loop_runs")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", run.id);
    await emit(userId, "growth_loop_converted", { loop_key: run.loop_key, run_id: run.id }, run.id);
    await refresh();
  }, [userId, refresh]);

  const dismiss = useCallback(async (run: GrowthLoopRun, reason?: string) => {
    if (!userId) return;
    await supabase
      .from("growth_loop_runs")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", run.id);
    await supabase.from("recommendation_feedback").insert({
      user_id: userId,
      rule: run.loop_key,
      verdict: "dismissed",
      source: "growth_loop",
      context: { reason: reason ?? null, run_id: run.id } as never,
    });
    await emit(userId, "growth_loop_dismissed", { loop_key: run.loop_key, run_id: run.id, reason }, run.id);
    await emit(userId, "recommendation_feedback_recorded", { rule: run.loop_key, verdict: "dismissed" }, run.loop_key);
    await refresh();
  }, [userId, refresh]);

  const active = runs.filter((r) => r.status === "triggered" || r.status === "notified" || r.status === "engaged");

  return { runs, active, loading, refresh, engage, convert, dismiss };
}
