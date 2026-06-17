// Read-side hook for the Opportunity Lifecycle Graph projection.
// One row per (user, category, opportunity). State is computed server-side
// by the project_opportunity_lifecycle() trigger — this hook just renders it.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LifecycleState =
  | "discovered"
  | "viewed"
  | "saved"
  | "applied"
  | "reviewing"
  | "shortlisted"
  | "accepted"
  | "completed"
  | "rejected"
  | "withdrawn";

export interface LifecycleRow {
  id: string;
  user_id: string;
  category: string;
  opportunity_id: string;
  state: LifecycleState;
  state_rank: number;
  application_id: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  saved_at: string | null;
  applied_at: string | null;
  reviewing_at: string | null;
  shortlisted_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  last_event_type: string | null;
  last_event_at: string | null;
  updated_at: string;
}

export const LIFECYCLE_ORDER: LifecycleState[] = [
  "viewed",
  "saved",
  "applied",
  "reviewing",
  "shortlisted",
  "accepted",
  "completed",
];

const TERMINAL: LifecycleState[] = ["rejected", "withdrawn"];

export function isTerminal(state: LifecycleState | null | undefined): boolean {
  return !!state && TERMINAL.includes(state);
}

export function nextExpected(state: LifecycleState | null | undefined): {
  owner: "you" | "author" | "system" | "—";
  label: string;
  eta: string;
} {
  switch (state) {
    case "viewed":
      return { owner: "you", label: "Save it or apply to lock intent", eta: "—" };
    case "saved":
      return { owner: "you", label: "Submit your application", eta: "—" };
    case "applied":
      return { owner: "author", label: "Author opens & reviews submission", eta: "3–7 days" };
    case "reviewing":
      return { owner: "author", label: "Shortlist decision or message", eta: "2–5 days" };
    case "shortlisted":
      return { owner: "author", label: "Interview or final decision", eta: "5–10 days" };
    case "accepted":
      return { owner: "you", label: "Onboarding / contract step", eta: "Immediate" };
    case "completed":
      return { owner: "system", label: "Reputation + revenue recorded", eta: "Done" };
    case "rejected":
      return { owner: "you", label: "Re-apply with updated info or pivot", eta: "—" };
    case "withdrawn":
      return { owner: "you", label: "Re-apply if circumstances changed", eta: "—" };
    default:
      return { owner: "—", label: "No lifecycle yet", eta: "—" };
  }
}

const TABLE = "opportunity_lifecycle_graph" as const;

export function useOpportunityLifecycle(
  userId: string | undefined,
  category: string | undefined,
  opportunityId: string | undefined,
) {
  const [row, setRow] = useState<LifecycleRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !category || !opportunityId) {
      setRow(null);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .eq("opportunity_id", opportunityId)
        .maybeSingle();
      if (cancelled) return;
      setRow((data as LifecycleRow) ?? null);
      setLoading(false);
    })();

    // Live updates so post-apply transitions reflect immediately.
    const channel = supabase
      .channel(`olg:${userId}:${category}:${opportunityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opportunity_lifecycle_graph",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as LifecycleRow | undefined;
          if (!next) return;
          if (next.category === category && next.opportunity_id === opportunityId) {
            setRow(next);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, category, opportunityId]);

  return { row, loading };
}

export function useUserLifecycleStream(userId: string | undefined, limit = 50) {
  const [rows, setRows] = useState<LifecycleRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setRows([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (cancelled) return;
      setRows((data as LifecycleRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  return { rows, loading };
}
