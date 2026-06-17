// Read-only "What's next?" card backed by the Opportunity Graph projection.
// Always present this as derived intelligence — never let it look like
// hard-coded suggestions.

import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useOpportunityRecommendations } from "@/hooks/useOpportunityRecommendations";

const kindLabel: Record<string, string> = {
  job: "Job",
  training: "Training",
  consulting: "Consulting",
  tender: "Tender",
  startup: "Startup",
};

const kindClass: Record<string, string> = {
  job: "bg-muted text-muted-foreground border-border",
  training: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  consulting: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  tender: "bg-muted text-muted-foreground border-border",
  startup: "bg-b4-teal/10 text-b4-teal border-b4-teal/20",
};

export function NextStepsCard({ userId }: { userId: string | undefined | null }) {
  const { recommendations, loading } = useOpportunityRecommendations(userId, { limit: 3 });

  if (!userId || loading) return null;
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-b4-teal/5 to-primary/5 rounded-3xl border border-b4-teal/20 p-8 mb-8">
      <div className="flex items-center gap-3 mb-1">
        <Sparkles className="w-5 h-5 text-b4-teal" />
        <h2 className="font-display text-xl font-bold text-foreground">Where to go next</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Ranked from your Expertise and Trust graphs. Every score is explainable.
      </p>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const matched = rec.explanation.skills_match?.matched ?? [];
          const reasonChips = [
            matched.length ? `${matched.length} skill match${matched.length > 1 ? "es" : ""}` : null,
            rec.trustPoints > 0 ? `trust +${Math.round(rec.trustPoints)}` : null,
            rec.experiencePoints > 0 ? `experience +${Math.round(rec.experiencePoints)}` : null,
            rec.freshnessPoints > 0 ? `fresh +${Math.round(rec.freshnessPoints)}` : null,
          ].filter(Boolean) as string[];

          return (
            <div
              key={`${rec.opportunityKind}:${rec.opportunityId}`}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
            >
              <div
                className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${kindClass[rec.opportunityKind] ?? "bg-muted"}`}
              >
                {kindLabel[rec.opportunityKind] ?? rec.opportunityKind}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {rec.nextAction}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {reasonChips.length ? reasonChips.join(" • ") : "Light signal — apply to strengthen it."}
                </div>
              </div>
              <div
                className="shrink-0 flex items-center justify-center rounded-full w-10 h-10 text-xs font-bold border bg-b4-teal/10 text-b4-teal border-b4-teal/30"
                title={`Match ${Math.round(rec.matchScore)} • confidence ${Math.round(rec.confidenceScore * 100)}%`}
              >
                {Math.round(rec.matchScore)}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/opportunities"
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-b4-teal hover:underline"
      >
        See all opportunities <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
