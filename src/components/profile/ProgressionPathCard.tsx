// Phase 7 — Professional Growth Path card.
// Renders the user's current stage and the next-best-action set sourced
// exclusively from the progression_graph projection via useNextBestActions().

import { ArrowRight, Sparkles, Target, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNextBestActions,
  progressionStageLabel,
  type NextBestAction,
} from "@/hooks/useNextBestActions";

const stageOrder = ["novice", "emerging", "capable", "monetizing", "building", "founder"];

function actionLabel(a: NextBestAction) {
  return (a.payload?.label as string) || a.action.replace(/_/g, " ");
}
function actionLink(a: NextBestAction) {
  return (a.payload?.link as string) || "/opportunities";
}

function missingSignals(a: NextBestAction): string[] {
  const cond = a.required_signals as Record<string, unknown>;
  const reason = a.reason as Record<string, unknown>;
  const items: string[] = [];
  const v = (k: string) => cond[k] as number;
  if (cond.verified_expertise_min && (reason.verified_expertise as number) < v("verified_expertise_min")) {
    items.push(`Verify ${v("verified_expertise_min") - (reason.verified_expertise as number)} more credential(s)`);
  }
  if (cond.trust_score_min && (reason.trust_score as number) < v("trust_score_min")) {
    items.push(`Reach trust score ${v("trust_score_min")}`);
  }
  if (cond.completed_transactions_min && (reason.completed_transactions as number) < v("completed_transactions_min")) {
    items.push(`Complete ${v("completed_transactions_min")} transaction(s)`);
  }
  return items;
}

export function ProgressionPathCard({ userId }: { userId: string | undefined | null }) {
  const { progression, loading, markActionCompleted } = useNextBestActions(userId);

  if (!userId || loading || !progression) return null;

  const stageIndex = stageOrder.indexOf(progression.current_state);
  const unlocked = progression.recommended_actions ?? [];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-b4-coral/5 rounded-3xl border border-primary/20 p-8 mb-8">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Professional Growth Path</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          Progression {Math.round(progression.progression_score)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Derived from your six graphs — Expertise, Trust, Opportunity, Revenue, Reputation, Ownership.
      </p>

      {/* Stage timeline */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {stageOrder.map((s, i) => {
          const reached = i <= stageIndex;
          const current = i === stageIndex;
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  current
                    ? "bg-primary text-primary-foreground border-primary"
                    : reached
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {progressionStageLabel[s]}
              </div>
              {i < stageOrder.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${reached ? "text-primary" : "text-muted-foreground"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Unlocked actions */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Unlocked opportunities
        </div>
        {unlocked.length === 0 && (
          <div className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
            No new paths unlocked yet. Add verified credentials or complete an engagement to advance from{" "}
            <span className="font-medium">{progressionStageLabel[progression.current_state]}</span>.
          </div>
        )}
        {unlocked.map((a) => {
          const missing = missingSignals(a);
          return (
            <div
              key={a.rule}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
            >
              <Sparkles className="w-5 h-5 text-b4-teal shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground capitalize">
                  {actionLabel(a)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Targets <span className="capitalize">{a.target_graph}</span> graph · advances to{" "}
                  <span className="capitalize">{a.target_stage}</span>
                </div>
                {missing.length > 0 && (
                  <div className="text-[11px] text-b4-coral mt-1">
                    Missing: {missing.join(" · ")}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link to={actionLink(a)}>
                    Go <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
                <button
                  className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  onClick={() => markActionCompleted(a)}
                  title="Mark this action as completed — emits an action_completed graph event."
                >
                  <CheckCircle2 className="w-3 h-3" /> Done
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
