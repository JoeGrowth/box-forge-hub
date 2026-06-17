import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Phase 7 — Progression Engine.
// Reads next-best-actions from the progression_graph projection. The hook
// never computes recommendations locally; it triggers recompute_progression
// once on mount (idempotent) and consumes the materialized row.

export interface NextBestAction {
  rule: string;
  action: string;
  payload: { link?: string; label?: string; category?: string } & Record<string, unknown>;
  target_stage: string | null;
  priority: number;
  reason: Record<string, unknown>;
  required_signals: Record<string, unknown>;
  target_graph: string;
}

export interface ProgressionState {
  current_state: string;
  recommended_actions: NextBestAction[];
  completed_actions_count: number;
  progression_score: number;
  computed_at: string;
}

export const progressionStageLabel: Record<string, string> = {
  novice: "Novice",
  emerging: "Emerging",
  capable: "Capable",
  monetizing: "Monetizing",
  building: "Building",
  founder: "Founder",
};

export function useNextBestActions(userId?: string | null) {
  const [progression, setProgression] = useState<ProgressionState | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await supabase.rpc("recompute_progression", { _user_id: userId });
      const { data } = await supabase
        .from("progression_graph")
        .select("current_state,recommended_actions,completed_actions_count,progression_score,computed_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setProgression({
          current_state: data.current_state as string,
          recommended_actions: (data.recommended_actions as unknown as NextBestAction[]) ?? [],
          completed_actions_count: data.completed_actions_count ?? 0,
          progression_score: Number(data.progression_score ?? 0),
          computed_at: data.computed_at as string,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Phase 7.7 — record completion as a graph event; worker will recompute.
  const markActionCompleted = useCallback(async (action: NextBestAction) => {
    if (!userId) return;
    await supabase.from("graph_events").insert({
      user_id: userId,
      event_type: "action_completed",
      event_version: 1,
      aggregate_type: "progression",
      aggregate_id: action.rule,
      source_module: "progression",
      idempotency_key: `action_completed:v1:${userId}:${action.rule}:${Date.now()}`,
      payload: { action: action.action, rule: action.rule } as never,
      weight: 1,
      occurred_at: new Date().toISOString(),
    });
    await refresh();
  }, [userId, refresh]);

  return { progression, loading, refresh, markActionCompleted };
}
