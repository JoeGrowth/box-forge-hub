// Read-only hook(s) over the opportunity_graph projection (Phase 3).
//
// The Opportunity Graph answers: "Where should this person go next?"
// Consumers MUST read recommendations through this hook so module-level
// recommendation logic stays out of components.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { USE_OPPORTUNITY_GRAPH } from "@/lib/featureFlags";

export type OpportunityKind =
  | "job"
  | "training"
  | "consulting"
  | "tender"
  | "startup"
  | (string & {});

export interface OpportunityExplanationPart {
  points: number;
  reason?: string;
  matched?: string[];
}

export interface OpportunityRecommendation {
  opportunityId: string;
  opportunityKind: OpportunityKind;
  matchScore: number;
  confidenceScore: number;
  expertisePoints: number;
  trustPoints: number;
  experiencePoints: number;
  intentPoints: number;
  freshnessPoints: number;
  nextAction: string;
  computedAt: string | null;
  explanation: {
    skills_match?: OpportunityExplanationPart;
    trust?: OpportunityExplanationPart;
    experience?: OpportunityExplanationPart;
    intent?: OpportunityExplanationPart;
    freshness?: OpportunityExplanationPart;
    weights?: Record<string, number>;
  };
}

function rowToRec(row: any): OpportunityRecommendation {
  return {
    opportunityId: row.opportunity_id,
    opportunityKind: row.opportunity_kind,
    matchScore: Number(row.match_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    expertisePoints: Number(row.expertise_points ?? 0),
    trustPoints: Number(row.trust_points ?? 0),
    experiencePoints: Number(row.experience_points ?? 0),
    intentPoints: Number(row.intent_points ?? 0),
    freshnessPoints: Number(row.freshness_points ?? 0),
    nextAction: row.next_action ?? "View opportunity",
    computedAt: row.computed_at ?? null,
    explanation: (row.explanation ?? {}) as OpportunityRecommendation["explanation"],
  };
}

interface UseRecOptions {
  limit?: number;
  kinds?: OpportunityKind[];
}

export function useOpportunityRecommendations(
  userId: string | undefined | null,
  options: UseRecOptions = {},
) {
  const { limit = 25, kinds } = options;
  const [recommendations, setRecommendations] = useState<OpportunityRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const kindsKey = kinds?.slice().sort().join(",") ?? "";

  const fetcher = useCallback(async () => {
    if (!userId || !USE_OPPORTUNITY_GRAPH) {
      setRecommendations([]);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("opportunity_graph")
      .select(
        "opportunity_id, opportunity_kind, match_score, confidence_score, expertise_points, trust_points, experience_points, intent_points, freshness_points, next_action, computed_at, explanation",
      )
      .eq("user_id", userId)
      .order("match_score", { ascending: false })
      .limit(limit);
    if (kinds?.length) q = q.in("opportunity_kind", kinds);
    const { data } = await q;
    setRecommendations((data ?? []).map(rowToRec));
    setLoading(false);
  }, [userId, limit, kindsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  /** Trigger a server-side recompute then refetch. Cheap on small graphs;
   *  in steady-state the async worker keeps this in sync via graph_events. */
  const refresh = useCallback(async () => {
    if (!userId) return;
    await supabase.rpc("recompute_opportunity_matches", { _user_id: userId });
    await fetcher();
  }, [userId, fetcher]);

  return { recommendations, loading, refresh };
}

/** Indexed-by-opportunity-id lookup for sorting an existing list. */
export function useOpportunityScoreMap(userId: string | undefined | null) {
  const { recommendations, loading, refresh } = useOpportunityRecommendations(userId, {
    limit: 500,
  });
  const scoreById = new Map<string, OpportunityRecommendation>();
  for (const r of recommendations) scoreById.set(r.opportunityId, r);
  return { scoreById, loading, refresh };
}
