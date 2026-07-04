// Phase 7 — Professional Growth Path card.
// P0.4 — Uses the shared RecommendationExplanationView so the reasons,
// missing signals and target stage are formatted identically across the
// Dashboard, Profile and OpportunityCard surfaces.

import { ArrowRight, Sparkles, Target, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useNextBestActions,
  progressionStageLabel,
  type NextBestAction,
} from "@/hooks/useNextBestActions";
import {
  RecommendationExplanationView,
  fromNextBestAction,
} from "@/components/shared/RecommendationExplanation";

const stageOrder = ["novice", "emerging", "capable", "monetizing", "building", "founder"];

const stageInfo: Record<string, { title: string; summary: string; unlocks: string }> = {
  novice: {
    title: "Novice",
    summary: "Starting point. Building baseline expertise, trust and visibility signals.",
    unlocks: "Foundational learning, profile setup, first credentials.",
  },
  emerging: {
    title: "Emerging",
    summary: "Verified skills and early reputation. Ready to explore consulting-style work.",
    unlocks: "Grow your consulting practice, structured advisory prep.",
  },
  capable: {
    title: "Capable",
    summary: "Proven delivery. Trusted to lead engagements and mentor peers.",
    unlocks: "Advisory missions, paid consulting engagements, team roles.",
  },
  monetizing: {
    title: "Monetizing",
    summary: "Consistent revenue from expertise. Recognised in your niche.",
    unlocks: "Recurring clients, service productisation, brand identity.",
  },
  building: {
    title: "Building",
    summary: "Assembling assets, team and processes — moving from operator to owner.",
    unlocks: "Startup formation, co-builder recruitment, equity structuring.",
  },
  founder: {
    title: "Founder",
    summary: "Full ownership stage. Running a structured, scalable entity.",
    unlocks: "Scaling path, decentralised operations, capital rounds.",
  },
};

function actionLabel(a: NextBestAction) {
  return (a.payload?.label as string) || a.action.replace(/_/g, " ");
}
function actionLink(a: NextBestAction) {
  return (a.payload?.link as string) || "/opportunities";
}

export function ProgressionPathCard({ userId }: { userId: string | undefined | null }) {
  const { progression, loading, markActionCompleted } = useNextBestActions(userId);

  if (!userId || loading || !progression) return null;

  const stageIndex = stageOrder.indexOf(progression.current_state);
  const unlocked = progression.recommended_actions ?? [];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-b4-coral/5 rounded-2xl md:rounded-3xl border border-primary/20 p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Target className="w-5 h-5 text-primary shrink-0" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">Professional Growth Path</h2>
        </div>
        <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
          Progression {Math.round(progression.progression_score)}
        </Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5">
        Derived from your six graphs — Expertise, Trust, Opportunity, Revenue, Reputation, Ownership.
      </p>

      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 mb-5 md:mb-6">
          {stageOrder.map((s, i) => {
            const reached = i <= stageIndex;
            const current = i === stageIndex;
            const info = stageInfo[s];
            return (
              <div key={s} className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border whitespace-nowrap cursor-help transition-colors ${
                        current
                          ? "bg-primary text-primary-foreground border-primary"
                          : reached
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {progressionStageLabel[s]}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-sm">
                        {info.title}
                        {current && <span className="ml-2 text-[10px] font-normal opacity-80">(current)</span>}
                      </div>
                      <div className="text-xs opacity-90">{info.summary}</div>
                      <div className="text-[11px] opacity-80">
                        <span className="font-medium">Unlocks:</span> {info.unlocks}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                {i < stageOrder.length - 1 && (
                  <ArrowRight className={`w-3 h-3 shrink-0 ${reached ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>

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
          const explanation = fromNextBestAction(a);
          return (
            <div
              key={a.rule}
              className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 bg-card border border-border rounded-xl p-3 sm:p-4"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Sparkles className="w-5 h-5 text-b4-teal shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="text-sm font-semibold text-foreground capitalize break-words">
                    {actionLabel(a)}
                  </div>
                  <RecommendationExplanationView data={explanation} />
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0 justify-end">
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
