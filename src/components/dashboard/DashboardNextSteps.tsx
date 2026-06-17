import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useNextBestActions,
  progressionStageLabel,
  type NextBestAction,
} from "@/hooks/useNextBestActions";

// Phase 7 cutover: this component no longer computes recommendations.
// It renders the progression_graph projection (next_best_action) sourced via
// useNextBestActions(). No direct reads from source tables remain here.

function priorityClass(priority: number) {
  if (priority <= 10) return "border-l-b4-coral";
  if (priority <= 20) return "border-l-b4-teal";
  return "border-l-muted-foreground";
}

function actionLabel(a: NextBestAction) {
  return (a.payload?.label as string) || a.action.replace(/_/g, " ");
}

function actionLink(a: NextBestAction) {
  return (a.payload?.link as string) || "/opportunities";
}

function reasonText(a: NextBestAction): string {
  const r = a.reason as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof r.verified_expertise === "number" && r.verified_expertise > 0) {
    parts.push(`${r.verified_expertise} verified credential${r.verified_expertise === 1 ? "" : "s"}`);
  }
  if (typeof r.trust_score === "number" && r.trust_score > 0) {
    parts.push(`trust ${r.trust_score}`);
  }
  if (typeof r.completed_transactions === "number" && r.completed_transactions > 0) {
    parts.push(`${r.completed_transactions} completed transactions`);
  }
  if (typeof r.reputation_level === "string" && r.reputation_level !== "verified") {
    parts.push(`reputation: ${r.reputation_level}`);
  }
  if (typeof r.ownership_level === "string" && r.ownership_level !== "none") {
    parts.push(`ownership: ${r.ownership_level.replace(/_/g, " ")}`);
  }
  return parts.length ? `Unlocked by: ${parts.join(" · ")}` : "Recommended for your current stage";
}

export function DashboardNextSteps() {
  const { user } = useAuth();
  const { progression, loading } = useNextBestActions(user?.id);

  const actions = progression?.recommended_actions ?? [];
  const stage = progression?.current_state ?? "novice";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Target className="w-3 h-3" />
            {progressionStageLabel[stage] ?? stage}
          </Badge>
        </div>
        {progression && (
          <p className="text-xs text-muted-foreground">
            Progression score {Math.round(progression.progression_score)} ·{" "}
            {progression.completed_actions_count} action
            {progression.completed_actions_count === 1 ? "" : "s"} completed
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.slice(0, 4).map((a) => (
          <Link
            key={a.rule}
            to={actionLink(a)}
            className={`block p-3 rounded-lg border-l-4 ${priorityClass(a.priority)} bg-muted/30 hover:bg-muted/50 transition-colors`}
            title={reasonText(a)}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-b4-teal/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-b4-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm capitalize">{actionLabel(a)}</div>
                <div className="text-xs text-muted-foreground">{reasonText(a)}</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                  via {a.target_graph} graph · → {a.target_stage}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        ))}

        {!loading && actions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-b4-teal" />
            <p className="text-sm">
              You're at the <span className="font-medium">{progressionStageLabel[stage] ?? stage}</span> stage.
              Keep building signals to unlock the next move.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
