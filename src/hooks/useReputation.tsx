// Phase 5 — Reputation Graph projection hook.
// useReputation(userId)      → reputation_graph row for one user
// useReputationBatch(ids)    → multi-user fetch for directory/cards
//
// Reputation is the synthesis of Expertise + Trust + Revenue + Community.
// Components must never compute reputation locally — read this projection.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReputationLevel = "verified" | "established" | "recognized" | "expert" | "authority";

export interface ReputationBreakdownRow {
  points: number;
  reason: string;
}

export interface ReputationProjection {
  user_id: string;
  reputation_score: number;
  reputation_level: ReputationLevel;
  achievement_count: number;
  impact_score: number;
  reliability_score: number;
  expertise_score: number;
  trust_score: number;
  revenue_score: number;
  community_score: number;
  reputation_breakdown: {
    expertise?: ReputationBreakdownRow;
    trust?: ReputationBreakdownRow;
    impact?: ReputationBreakdownRow;
    community?: ReputationBreakdownRow;
    weights?: Record<string, number>;
  };
  computed_at: string;
}

const LEVEL_STYLE: Record<ReputationLevel, { label: string; className: string }> = {
  verified:    { label: "Verified",    className: "bg-muted text-foreground border-border" },
  established: { label: "Established", className: "bg-b4-teal/10 text-b4-teal border-b4-teal/30" },
  recognized:  { label: "Recognized",  className: "bg-b4-coral/10 text-b4-coral border-b4-coral/30" },
  expert:      { label: "Expert",      className: "bg-primary/10 text-primary border-primary/30" },
  authority:   { label: "Authority",   className: "bg-primary text-primary-foreground border-primary" },
};

export function reputationLevelStyle(level: ReputationLevel | string) {
  return LEVEL_STYLE[(level as ReputationLevel)] ?? LEVEL_STYLE.verified;
}

export function useReputation(userId?: string | null) {
  const [data, setData] = useState<ReputationProjection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from("reputation_graph")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (alive) {
        setData((row as unknown as ReputationProjection | null) ?? null);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return { reputation: data, loading };
}

export function useReputationBatch(userIds: string[]) {
  const [data, setData] = useState<Record<string, ReputationProjection>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userIds || userIds.length === 0) { setData({}); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("reputation_graph")
        .select("*")
        .in("user_id", userIds);
      if (alive) {
        const map: Record<string, ReputationProjection> = {};
        for (const r of (rows ?? []) as unknown as ReputationProjection[]) {
          map[r.user_id] = r;
        }
        setData(map);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userIds.join(",")]);

  return { reputationByUser: data, loading };
}
