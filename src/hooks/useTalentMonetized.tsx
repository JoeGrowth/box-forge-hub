import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const MONETIZATION_TARGET = 10;

export interface TalentMonetizedState {
  loading: boolean;
  soloDelivered: number;
  contractorsDelivered: number;
  equityDelivered: number;
  totalDelivered: number;
  talentMonetized: boolean;
  refresh: () => void;
}

/**
 * Mirrors the "Talent Monetization in solo mode and with contractors (x/10)"
 * milestone used in DashboardProgress so pages can gate on it.
 */
export function useTalentMonetized(): TalentMonetizedState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    loading: true,
    solo: 0,
    contractors: 0,
    equity: 0,
  });

  const compute = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setState({ loading: false, solo: 0, contractors: 0, equity: 0 });
      return;
    }

    const { data: closedOpps } = await supabase
      .from("consultant_opportunities")
      .select("id")
      .eq("user_id", user.id)
      .eq("stage", "closed");

    const closedIds = ((closedOpps ?? []) as { id: string }[]).map((o) => o.id);
    let solo = 0;
    let contractors = 0;
    let equity = 0;

    if (closedIds.length > 0) {
      const { data: dists } = await supabase
        .from("consultant_opportunity_distributions")
        .select("opportunity_id, recipient_name, note")
        .in("opportunity_id", closedIds);

      const byOpp: Record<string, { name: string; note: string | null }[]> = {};
      ((dists ?? []) as any[]).forEach((d) => {
        (byOpp[d.opportunity_id] ||= []).push({
          name: d.recipient_name || "",
          note: d.note,
        });
      });

      for (const id of closedIds) {
        const list = byOpp[id] || [];
        const hasEquity = list.some((r) =>
          /associé|associe|equity|partner|co[- ]?builder/i.test(
            `${r.name} ${r.note ?? ""}`,
          ),
        );
        if (list.length <= 1) solo++;
        else if (hasEquity) equity++;
        else contractors++;
      }
    }

    setState({ loading: false, solo, contractors, equity });
  }, [authLoading, user]);

  useEffect(() => {
    compute();
  }, [compute]);

  const totalDelivered = state.solo + state.contractors;

  return {
    loading: state.loading || authLoading,
    soloDelivered: state.solo,
    contractorsDelivered: state.contractors,
    equityDelivered: state.equity,
    totalDelivered,
    talentMonetized: totalDelivered >= MONETIZATION_TARGET,
    refresh: compute,
  };
}
