// Sprint 5A — OpportunityCardV2.
// Answers the 4 product questions in a single, scannable layout:
//   1. What is the opportunity?
//   2. Why was it recommended to me?
//   3. What evidence is expected?
//   4. What relationship could result?
//
// Wraps the same data shape as the legacy OpportunityCard so callers can swap.

import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import { TrustBlock } from "@/components/trust/TrustBlock";
import { WhyRecommended } from "./WhyRecommended";
import { ExpectedEvidence } from "./ExpectedEvidence";
import { ResultingRelationship } from "./ResultingRelationship";
import type { Opportunity } from "./OpportunityCard";
import type { OpportunityRecommendation } from "@/hooks/useOpportunityRecommendations";

const categoryConfig: Record<Opportunity["category"], { label: string; className: string }> = {
  startup: { label: "Startup", className: "bg-b4-teal/10 text-b4-teal border-b4-teal/20" },
  training: { label: "Training", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  consulting: { label: "Consulting", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  tender: { label: "Tender", className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  job: { label: "Job", className: "bg-muted text-muted-foreground border-border" },
};

interface Props {
  opportunity: Opportunity;
  matchScore?: number;
  recommendation?: OpportunityRecommendation;
  ctaOverride?: { label: string };
}

export function OpportunityCardV2({ opportunity, matchScore, recommendation, ctaOverride }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = categoryConfig[opportunity.category];
  const { isSaved, toggle } = useSavedOpportunities(user?.id);
  const saved = isSaved(opportunity.id);

  const goToDetail = () => navigate(opportunity.primary_action.route);

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      {/* (1) What is it? — title row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
            {opportunity.sector && (
              <span className="text-xs text-muted-foreground">{opportunity.sector}</span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{opportunity.income_range}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{opportunity.effort_level}</span>
          </div>
          <button
            onClick={goToDetail}
            className="text-left font-display text-base font-semibold text-foreground leading-tight hover:text-primary transition-colors"
          >
            {opportunity.title}
          </button>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{opportunity.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(opportunity.id, opportunity.category);
            }}
            aria-label={saved ? "Remove bookmark" : "Save for later"}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
          </button>

          {matchScore != null && (
            <div
              className={`shrink-0 flex items-center justify-center rounded-full w-11 h-11 text-xs font-bold border ${
                matchScore >= 75
                  ? "bg-b4-teal/10 text-b4-teal border-b4-teal/30"
                  : matchScore >= 40
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
              title="Match score"
            >
              {matchScore}%
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {opportunity.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {opportunity.required_skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs font-normal px-2 py-0.5">
              {skill}
            </Badge>
          ))}
        </div>
      )}

      {/* (2) Why recommended + (3) Evidence expected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 pt-3 border-t border-border">
        <WhyRecommended recommendation={recommendation} />
        <ExpectedEvidence category={opportunity.category} requiredSkills={opportunity.required_skills} />
      </div>

      {/* (4) Resulting relationship */}
      <div className="mb-3">
        <ResultingRelationship category={opportunity.category} />
      </div>

      {/* Footer: author trust + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
            From {opportunity.author_name}
          </p>
          {opportunity.author_user_id ? (
            <TrustBlock userId={opportunity.author_user_id} variant="inline" />
          ) : null}
        </div>

        <Button size="sm" onClick={goToDetail} className="shrink-0">
          {ctaOverride?.label ?? opportunity.primary_action.label}
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
