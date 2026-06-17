import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  XCircle,
  ArrowRight,
  Eye,
  Bookmark,
  Send,
  ClipboardList,
  Star,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LIFECYCLE_ORDER,
  isTerminal,
  nextExpected,
  useOpportunityLifecycle,
  type LifecycleState,
} from "@/hooks/useOpportunityLifecycle";

// Post-apply state surface, now backed by the opportunity_lifecycle_graph
// projection. Falls back to the legacy applications / opportunity_interactions /
// startup_applications reads if no lifecycle row exists yet (older data).

const STATE_META: Record<
  LifecycleState,
  { label: string; icon: typeof Clock; tone: string }
> = {
  discovered:  { label: "Discovered",  icon: Eye,           tone: "text-muted-foreground" },
  viewed:      { label: "Viewed",      icon: Eye,           tone: "text-muted-foreground" },
  saved:       { label: "Saved",       icon: Bookmark,      tone: "text-amber-600" },
  applied:     { label: "Submitted",   icon: Send,          tone: "text-amber-600" },
  reviewing:   { label: "In review",   icon: ClipboardList, tone: "text-blue-600" },
  shortlisted: { label: "Shortlisted", icon: Star,          tone: "text-blue-600" },
  accepted:    { label: "Accepted",    icon: CheckCircle2,  tone: "text-b4-teal" },
  completed:   { label: "Completed",   icon: Trophy,        tone: "text-b4-teal" },
  rejected:    { label: "Declined",    icon: XCircle,       tone: "text-muted-foreground" },
  withdrawn:   { label: "Withdrawn",   icon: XCircle,       tone: "text-muted-foreground" },
};

function legacyToState(s: string | null | undefined): LifecycleState | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "accepted" || v === "approved") return "accepted";
  if (v === "rejected" || v === "declined") return "rejected";
  if (v === "withdrawn") return "withdrawn";
  if (v === "completed") return "completed";
  if (v === "shortlisted") return "shortlisted";
  if (v === "reviewing" || v === "in_review" || v === "interview") return "reviewing";
  if (v === "submitted" || v === "pending") return "applied";
  return null;
}

export function OpportunityStatusPanel({
  userId,
  opportunityId,
  category,
  source = "opportunity_interactions",
  onChatRoute,
}: {
  userId: string;
  opportunityId: string;
  /** Category required for lifecycle lookup. */
  category?: string;
  /** Legacy fallback source. */
  source?: "opportunity_interactions" | "startup_applications";
  onChatRoute?: string;
}) {
  const resolvedCategory = category ?? (source === "startup_applications" ? "startup" : undefined);
  const { row } = useOpportunityLifecycle(userId, resolvedCategory, opportunityId);

  // Legacy fallback when projection hasn't materialized yet
  const [legacy, setLegacy] = useState<{ state: LifecycleState; at: string | null } | null>(null);
  useEffect(() => {
    if (row) return; // projection wins
    let cancelled = false;
    (async () => {
      const q =
        source === "startup_applications"
          ? supabase
              .from("startup_applications")
              .select("status, created_at")
              .eq("startup_id", opportunityId)
              .eq("applicant_id", userId)
              .maybeSingle()
          : (supabase.from("opportunity_interactions" as any) as any)
              .select("status, created_at")
              .eq("opportunity_id", opportunityId)
              .eq("user_id", userId)
              .maybeSingle();
      const { data } = await q;
      if (cancelled || !data) return;
      const mapped = legacyToState((data as any).status);
      if (mapped) setLegacy({ state: mapped, at: (data as any).created_at });
    })();
    return () => { cancelled = true; };
  }, [row, userId, opportunityId, source]);

  const state: LifecycleState | null = row?.state ?? legacy?.state ?? null;
  if (!state || state === "discovered" || state === "viewed") return null;

  const meta = STATE_META[state];
  const Icon = meta.icon;
  const next = nextExpected(state);
  const terminal = isTerminal(state);

  // Active index in the canonical journey (excluding terminal branches)
  const activeIdx = terminal
    ? LIFECYCLE_ORDER.indexOf("applied")
    : LIFECYCLE_ORDER.indexOf(state);

  const submittedAt = row?.applied_at ?? legacy?.at ?? row?.last_event_at ?? null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${meta.tone}`} />
        <p className="font-semibold text-foreground">Lifecycle — {meta.label}</p>
      </div>

      {!terminal && (
        <div className="flex items-center gap-1">
          {LIFECYCLE_ORDER.map((p, i) => {
            const reached = i <= activeIdx;
            return (
              <div key={p} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-1.5 flex-1 rounded-full ${reached ? "bg-primary" : "bg-muted"}`}
                  title={STATE_META[p].label}
                />
                {i < LIFECYCLE_ORDER.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">Next owner</p>
          <p className="font-medium text-foreground capitalize">{next.owner}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">Next expected</p>
          <p className="font-medium text-foreground">{next.label}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">ETA</p>
          <p className="font-medium text-foreground">{next.eta}</p>
        </div>
      </div>

      {submittedAt && (
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(submittedAt).toLocaleDateString()}
          {row?.view_count ? ` · ${row.view_count} view${row.view_count > 1 ? "s" : ""}` : ""}
        </p>
      )}

      {(state === "accepted" || state === "shortlisted") && onChatRoute && (
        <Button size="sm" className="w-full" onClick={() => (window.location.href = onChatRoute)}>
          <MessageCircle className="w-3 h-3 mr-1" />
          Open conversation
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
