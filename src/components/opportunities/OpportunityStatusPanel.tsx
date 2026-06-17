import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, MessageCircle, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Post-apply state surface.
// Reads opportunity_interactions.status (generic categories) or
// startup_applications.status (startup category) to render the lifecycle:
//   submitted → awaiting_review → in_review → accepted | rejected
//
// Each state declares: who owns the next action, the next expected event,
// and a typical ETA. Closes the "submit black hole" UX gap.

type Phase = "submitted" | "in_review" | "accepted" | "rejected";

const PHASES: Phase[] = ["submitted", "in_review", "accepted"];

const PHASE_META: Record<Phase, { label: string; icon: typeof Clock; owner: string; eta: string; tone: string }> = {
  submitted: {
    label: "Submitted",
    icon: Clock,
    owner: "Author",
    eta: "Typical first response: 3–7 days",
    tone: "text-amber-600",
  },
  in_review: {
    label: "In review",
    icon: MessageCircle,
    owner: "Author",
    eta: "Conversation expected within a few days",
    tone: "text-blue-600",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    owner: "You",
    eta: "Move to chat to finalize next steps",
    tone: "text-b4-teal",
  },
  rejected: {
    label: "Declined",
    icon: XCircle,
    owner: "You",
    eta: "You may re-apply with updated information",
    tone: "text-muted-foreground",
  },
};

function normalizePhase(status: string | null | undefined): Phase {
  const s = (status || "").toLowerCase();
  if (s === "accepted" || s === "approved") return "accepted";
  if (s === "rejected" || s === "declined") return "rejected";
  if (s === "in_review" || s === "reviewing" || s === "interview") return "in_review";
  return "submitted";
}

export function OpportunityStatusPanel({
  userId,
  opportunityId,
  source = "opportunity_interactions",
  onChatRoute,
}: {
  userId: string;
  opportunityId: string;
  /** Which table to read status from. Startup applications use a separate stream. */
  source?: "opportunity_interactions" | "startup_applications";
  onChatRoute?: string;
}) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const query =
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
      const { data } = await query;
      if (cancelled || !data) return;
      setPhase(normalizePhase((data as any).status));
      setSubmittedAt((data as any).created_at);
    };
    load();
    return () => { cancelled = true; };
  }, [userId, opportunityId, source]);

  if (!phase) return null;

  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  const activeIdx = PHASES.indexOf(phase === "rejected" ? "submitted" : phase);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${meta.tone}`} />
        <p className="font-semibold text-foreground">Application status — {meta.label}</p>
      </div>

      {phase !== "rejected" && (
        <div className="flex items-center gap-2">
          {PHASES.map((p, i) => {
            const active = i <= activeIdx;
            return (
              <div key={p} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />
                {i < PHASES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">Next owner</p>
          <p className="font-medium text-foreground">{meta.owner}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">Next expected</p>
          <p className="font-medium text-foreground">
            {phase === "submitted" && "Author reviews your submission"}
            {phase === "in_review" && "Direct message or interview request"}
            {phase === "accepted" && "Onboarding / contract step"}
            {phase === "rejected" && "—"}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-muted-foreground mb-0.5">ETA</p>
          <p className="font-medium text-foreground">{meta.eta}</p>
        </div>
      </div>

      {submittedAt && (
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(submittedAt).toLocaleDateString()}
        </p>
      )}

      {phase === "accepted" && onChatRoute && (
        <Button size="sm" className="w-full" onClick={() => (window.location.href = onChatRoute)}>
          Open conversation
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
