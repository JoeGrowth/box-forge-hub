// Phase 4 — Revenue Graph projection hooks.
// useRevenue(userId)      → revenue_graph row for one user
// useTransactions(userId) → raw transactions where the user is buyer or seller
//
// Components must source revenue display from these hooks, never compute
// economic aggregates locally. Replay-safe by construction: the projection is
// the only source of truth.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RevenueProjection {
  user_id: string;
  total_revenue: number;
  total_spent: number;
  transaction_count: number;
  completed_value_count: number;
  buyer_count: number;
  seller_count: number;
  revenue_breakdown: Record<string, {
    transactions: number;
    completed: number;
    revenue: number;
    spent: number;
  }>;
  computed_at: string;
}

export interface TransactionRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  opportunity_id: string | null;
  opportunity_kind: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useRevenue(userId?: string | null) {
  const [data, setData] = useState<RevenueProjection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from("revenue_graph")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (alive) {
        setData((row as RevenueProjection | null) ?? null);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return { revenue: data, loading };
}

export function useTransactions(userId?: string | null) {
  const [data, setData] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData([]); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("transactions")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (alive) {
        setData((rows as TransactionRow[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return { transactions: data, loading };
}
