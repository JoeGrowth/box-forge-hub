// Read-only hook(s) over the expertise_graph projection.
//
// All UI displaying a user's expertise must read through these hooks.
// UI must NOT query user_skills / user_certifications / startup_team_members
// directly for expertise purposes — that re-creates the silo the graph
// platform exists to eliminate.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { USE_EXPERTISE_GRAPH } from "@/lib/featureFlags";

export interface Expertise {
  userId: string;
  score: number;
  level: "novice" | "emerging" | "intermediate" | "advanced" | "expert";
  tags: string[];
  verifiedCount: number;
  monetizable: {
    skills?: number;
    certifications?: number;
    contributions?: number;
    trainings_delivered?: number;
    consulting_engagements?: number;
  };
  computedAt: string | null;
}

const EMPTY: Omit<Expertise, "userId"> = {
  score: 0,
  level: "novice",
  tags: [],
  verifiedCount: 0,
  monetizable: {},
  computedAt: null,
};

function rowToExpertise(userId: string, data: any): Expertise {
  return {
    userId,
    score: Number(data?.expertise_score ?? 0),
    level: (data?.expertise_level ?? "novice") as Expertise["level"],
    tags: (data?.expertise_tags ?? []) as string[],
    verifiedCount: data?.verified_expertise_count ?? 0,
    monetizable: (data?.monetizable_expertise ?? {}) as Expertise["monetizable"],
    computedAt: data?.computed_at ?? null,
  };
}

export function useExpertise(userId: string | undefined | null) {
  const [expertise, setExpertise] = useState<Expertise | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !USE_EXPERTISE_GRAPH) { setExpertise(null); return; }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("expertise_graph")
        .select("user_id, expertise_score, expertise_level, expertise_tags, verified_expertise_count, monetizable_expertise, computed_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      setExpertise(error || !data ? { userId, ...EMPTY } : rowToExpertise(userId, data));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { expertise, loading };
}

/**
 * Batch variant for directory-style screens (e.g. CoBuilders). One query,
 * no per-user fan-out. Returns a Map keyed by user_id; missing rows fall
 * back to the EMPTY projection so consumers never see undefined.
 */
export function useExpertiseBatch(userIds: string[]) {
  const [byUser, setByUser] = useState<Map<string, Expertise>>(new Map());
  const [loading, setLoading] = useState(false);
  const key = userIds.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (!USE_EXPERTISE_GRAPH || userIds.length === 0) {
      setByUser(new Map());
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("expertise_graph")
        .select("user_id, expertise_score, expertise_level, expertise_tags, verified_expertise_count, monetizable_expertise, computed_at")
        .in("user_id", userIds);

      if (cancelled) return;
      const map = new Map<string, Expertise>();
      for (const uid of userIds) map.set(uid, { userId: uid, ...EMPTY });
      for (const row of data ?? []) map.set(row.user_id, rowToExpertise(row.user_id, row));
      setByUser(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { byUser, loading };
}
