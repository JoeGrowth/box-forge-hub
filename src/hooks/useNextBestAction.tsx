import { useMemo } from "react";
import {
  useNextBestActions,
  type NextBestAction,
  type ProgressionState,
} from "./useNextBestActions";

// P0 — Canonical Next Best Action stream.
// Every surface (Dashboard, ProgressionPathCard, OpportunityCard,
// GrowthLoopsCard, lifecycle hints) consumes this facade so guidance
// stays consistent. The source of truth remains the progression_graph
// projection — this hook only filters/limits per surface.

export type NbaSurface =
  | "dashboard"
  | "growth_path"
  | "growth_loops"
  | "opportunity"
  | "lifecycle";

interface UseNextBestActionOptions {
  surface: NbaSurface;
  /** Filter to actions tagged with this category in payload.category. */
  category?: string;
  /** Cap how many actions to return. Surface-specific defaults applied. */
  limit?: number;
}

const surfaceDefaults: Record<NbaSurface, number> = {
  dashboard: 4,
  growth_path: 8,
  growth_loops: 1,
  opportunity: 1,
  lifecycle: 2,
};

export interface UseNextBestActionResult {
  actions: NextBestAction[];
  topAction: NextBestAction | null;
  progression: ProgressionState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  markActionCompleted: (a: NextBestAction) => Promise<void>;
}

export function useNextBestAction(
  userId: string | null | undefined,
  { surface, category, limit }: UseNextBestActionOptions,
): UseNextBestActionResult {
  const base = useNextBestActions(userId);

  const actions = useMemo(() => {
    const all = base.progression?.recommended_actions ?? [];
    const filtered = category
      ? all.filter((a) => (a.payload?.category as string | undefined) === category)
      : all;
    // Already priority-ordered by the projection; preserve that order.
    return filtered.slice(0, limit ?? surfaceDefaults[surface]);
  }, [base.progression, surface, category, limit]);

  return {
    actions,
    topAction: actions[0] ?? null,
    progression: base.progression,
    loading: base.loading,
    refresh: base.refresh,
    markActionCompleted: base.markActionCompleted,
  };
}
