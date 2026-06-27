import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  progressionStageLabel,
  type NextBestAction,
} from "@/hooks/useNextBestActions";
import { useNextBestAction } from "@/hooks/useNextBestAction";
import {
  RecommendationExplanationView,
  fromNextBestAction,
} from "@/components/shared/RecommendationExplanation";

// Phase 7 cutover: this component no longer computes recommendations.
// P0.4: explanation is rendered via the shared RecommendationExplanationView
// so Dashboard, Profile and OpportunityCard share identical phrasing.

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

export function DashboardNextSteps() {
  const { user } = useAuth();
  const { actions, progression, loading } = useNextBestAction(user?.id, {
    surface: "dashboard",
  });

  const stage = progression?.current_state ?? "novice";

  // Novice users get a cleaner dashboard — no recommended next steps card.
  if (!loading && stage === "novice") return null;


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your next move</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Target className="w-3 h-3" />
            {progressionStageLabel[stage] ?? stage}
          </Badge>
        </div>
        {progression && (
          <p className="text-xs text-muted-foreground">
            Momentum score {Math.round(progression.progression_score)} ·{" "}
            {progression.completed_actions_count} move
            {progression.completed_actions_count === 1 ? "" : "s"} already made
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((a) => {
          const explanation = fromNextBestAction(a);
          return (
            <Link
              key={a.rule}
              to={actionLink(a)}
              className={`block p-3 rounded-lg border-l-4 ${priorityClass(a.priority)} bg-muted/30 hover:bg-muted/50 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-b4-teal/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-b4-teal" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="font-medium text-sm capitalize">{actionLabel(a)}</div>
                  <RecommendationExplanationView data={explanation} compact />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          );
        })}

        {!loading && actions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-b4-teal" />
            <p className="text-sm">
              You're at <span className="font-medium">{progressionStageLabel[stage] ?? stage}</span>.
              Keep stacking signals — the next move unlocks itself.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
