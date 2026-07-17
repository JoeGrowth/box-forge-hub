import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgressionLadder } from "@/hooks/useProgressionLadder";

/**
 * Access to shared entrepreneurship surfaces (e.g. /projects, ecosystem browsing).
 * Requires the user to hold an Initiator or Co-Builder certification, or to have
 * unlocked the Grown (Advisor) step in "Your Talent".
 */
export function useEntrepreneurCertGate() {
  const { user, loading: authLoading } = useAuth();
  const { stages, loading: ladderLoading } = useProgressionLadder();
  const [hasCert, setHasCert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_certifications")
        .select("certification_type")
        .eq("user_id", user.id);
      if (!alive) return;
      const list = (data ?? []) as Array<{ certification_type: string }>;
      setHasCert(
        list.some(
          (c) =>
            c.certification_type === "initiator_b4" ||
            c.certification_type === "cobuilder_b4"
        )
      );
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user, authLoading]);

  const advisorAchieved = stages.find((s) => s.key === "advisor")?.achieved ?? false;

  return {
    loading: loading || authLoading || ladderLoading,
    allowed: hasCert || advisorAchieved,
    hasCert,
    advisorAchieved,
  };
}
