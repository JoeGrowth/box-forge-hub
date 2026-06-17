// Phase 6 — Ownership Graph projection hooks.
// useOwnership(userId)          → ownership_graph row
// useVentureOwnership(ventureId)→ allocations + vesting for a venture
// useEquityAllocation(allocId)  → single allocation + its ledger
//
// Equity is now a first-class entity. Components must never compute equity
// totals locally — read from these projections / tables.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OwnershipLevel =
  | "none" | "light_contributor" | "meaningful_contributor" | "major_contributor" | "founder";

export interface OwnershipContribution {
  venture: string;
  role: string;
  allocated: string;
  vested: string;
  status: string;
}

export interface OwnershipProjection {
  user_id: string;
  venture_count: number;
  total_allocated_equity: number;
  total_vested_equity: number;
  active_allocations: number;
  ownership_level: OwnershipLevel;
  ownership_breakdown: {
    ventures?: number;
    allocated?: string;
    vested?: string;
    contributions?: OwnershipContribution[];
  };
  computed_at: string;
}

export interface EquityAllocation {
  id: string;
  venture_id: string;
  user_id: string;
  role: string | null;
  percentage: number;
  status: string;
  source: string;
  created_at: string;
}

const OWNERSHIP_LEVEL_STYLE: Record<OwnershipLevel, { label: string; className: string }> = {
  none:                   { label: "No equity",            className: "bg-muted text-muted-foreground border-border" },
  light_contributor:      { label: "Light contributor",    className: "bg-b4-teal/10 text-b4-teal border-b4-teal/30" },
  meaningful_contributor: { label: "Meaningful contributor", className: "bg-b4-coral/10 text-b4-coral border-b4-coral/30" },
  major_contributor:      { label: "Major contributor",    className: "bg-primary/10 text-primary border-primary/30" },
  founder:                { label: "Founder",              className: "bg-primary text-primary-foreground border-primary" },
};

export function ownershipLevelStyle(level: OwnershipLevel | string) {
  return OWNERSHIP_LEVEL_STYLE[(level as OwnershipLevel)] ?? OWNERSHIP_LEVEL_STYLE.none;
}

export function useOwnership(userId?: string | null) {
  const [data, setData] = useState<OwnershipProjection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from("ownership_graph")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (alive) {
        setData((row as unknown as OwnershipProjection | null) ?? null);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return { ownership: data, loading };
}

export function useVentureOwnership(ventureId?: string | null) {
  const [allocations, setAllocations] = useState<EquityAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ventureId) { setAllocations([]); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("equity_allocations")
        .select("*")
        .eq("venture_id", ventureId)
        .order("percentage", { ascending: false });
      if (alive) {
        setAllocations((rows as EquityAllocation[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ventureId]);

  return { allocations, loading };
}

export function useEquityAllocation(allocationId?: string | null) {
  const [allocation, setAllocation] = useState<EquityAllocation | null>(null);
  const [ledger, setLedger] = useState<Array<{ id: string; event_type: string; percentage: number; occurred_at: string; metadata: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allocationId) { setAllocation(null); setLedger([]); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const [{ data: alloc }, { data: events }] = await Promise.all([
        supabase.from("equity_allocations").select("*").eq("id", allocationId).maybeSingle(),
        supabase.from("equity_events").select("*").eq("equity_allocation_id", allocationId).order("occurred_at", { ascending: true }),
      ]);
      if (alive) {
        setAllocation((alloc as EquityAllocation | null) ?? null);
        setLedger((events as never) ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [allocationId]);

  return { allocation, ledger, loading };
}
