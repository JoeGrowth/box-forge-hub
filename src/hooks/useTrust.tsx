// Read-only hook(s) over the trust_graph projection.
//
// Trust answers: "Why should someone believe this person?"
// It is evidence-based (verified credentials, completed work, reviews) and
// is materialized asynchronously by the project-graph-events worker.
//
// No component is allowed to compute trust locally. All trust reads MUST
// go through these hooks so the projection remains the single source.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationLevel = "unverified" | "basic" | "verified" | "trusted";

export interface Trust {
  userId: string;
  score: number;
  level: VerificationLevel;
  verifiedCount: number;
  reviewScore: number;
  completionScore: number;
  breakdown: Record<string, { count?: number; average?: number; weight: number; points: number }>;
  computedAt: string | null;
}

const EMPTY: Omit<Trust, "userId"> = {
  score: 0,
  level: "unverified",
  verifiedCount: 0,
  reviewScore: 0,
  completionScore: 0,
  breakdown: {},
  computedAt: null,
};

function rowToTrust(userId: string, data: any): Trust {
  return {
    userId,
    score: Number(data?.trust_score ?? 0),
    level: (data?.verification_level ?? "unverified") as VerificationLevel,
    verifiedCount: data?.verified_count ?? 0,
    reviewScore: Number(data?.review_score ?? 0),
    completionScore: Number(data?.completion_score ?? 0),
    breakdown: (data?.trust_breakdown ?? {}) as Trust["breakdown"],
    computedAt: data?.computed_at ?? null,
  };
}

export function useTrust(userId: string | undefined | null) {
  const [trust, setTrust] = useState<Trust | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setTrust(null); return; }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("trust_graph" as any)
        .select("user_id, trust_score, verification_level, verified_count, review_score, completion_score, trust_breakdown, computed_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      setTrust(error || !data ? { userId, ...EMPTY } : rowToTrust(userId, data));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { trust, loading };
}

/** Batch read for directory-style screens. */
export function useTrustBatch(userIds: string[]) {
  const [byUser, setByUser] = useState<Map<string, Trust>>(new Map());
  const [loading, setLoading] = useState(false);
  const key = userIds.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (userIds.length === 0) { setByUser(new Map()); return; }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trust_graph" as any)
        .select("user_id, trust_score, verification_level, verified_count, review_score, completion_score, trust_breakdown, computed_at")
        .in("user_id", userIds);

      if (cancelled) return;
      const map = new Map<string, Trust>();
      for (const uid of userIds) map.set(uid, { userId: uid, ...EMPTY });
      for (const row of (data as any[]) ?? []) map.set(row.user_id, rowToTrust(row.user_id, row));
      setByUser(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { byUser, loading };
}

/** Small presentational helper — colour + label per verification level. */
export function trustLevelStyle(level: VerificationLevel) {
  switch (level) {
    case "trusted":    return { label: "Trusted",    className: "bg-b4-teal/15 text-b4-teal border-b4-teal/30" };
    case "verified":   return { label: "Verified",   className: "bg-b4-purple/15 text-b4-purple border-b4-purple/30" };
    case "basic":      return { label: "Basic",      className: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    default:           return { label: "Unverified", className: "bg-muted text-muted-foreground border-border" };
  }
}
