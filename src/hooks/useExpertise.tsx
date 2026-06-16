// Read-only hook over the expertise_graph projection.
//
// All UI displaying a user's expertise must read through this hook.
// UI must NOT query user_skills / user_certifications directly for expertise
// purposes — that re-creates the silo the graph platform exists to eliminate.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useExpertise(userId: string | undefined | null) {
  const [expertise, setExpertise] = useState<Expertise | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setExpertise(null); return; }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("expertise_graph")
        .select("user_id, expertise_score, expertise_level, expertise_tags, verified_expertise_count, monetizable_expertise, computed_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setExpertise({ userId, ...EMPTY });
      } else {
        setExpertise({
          userId,
          score: Number(data.expertise_score ?? 0),
          level: (data.expertise_level ?? "novice") as Expertise["level"],
          tags: (data.expertise_tags ?? []) as string[],
          verifiedCount: data.verified_expertise_count ?? 0,
          monetizable: (data.monetizable_expertise ?? {}) as Expertise["monetizable"],
          computedAt: data.computed_at ?? null,
        });
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { expertise, loading };
}
