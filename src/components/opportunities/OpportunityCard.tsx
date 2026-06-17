import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ShieldCheck, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Opportunity {
  id: string;
  title: string;
  category: "job" | "consulting" | "tender" | "startup" | "training";
  required_skills: string[];
  income_range: string;
  effort_level: string;
  description: string;
  /** route is the canonical detail surface. Cards never open dialogs anymore. */
  primary_action: { type: "apply" | "join" | "start"; label: string; route: string };
  source_id: string;
  created_at: string;
  author_name: string;
  author_user_id?: string | null;
  sector: string | null;
  rank: number;
}

const categoryConfig: Record<Opportunity["category"], { label: string; className: string }> = {
  startup: { label: "Startup", className: "bg-b4-teal/10 text-b4-teal border-b4-teal/20" },
  training: { label: "Training", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  consulting: { label: "Consulting", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  tender: { label: "Tender", className: "bg-muted text-muted-foreground border-border" },
  job: { label: "Job", className: "bg-muted text-muted-foreground border-border" },
};

import type { OpportunityRecommendation } from "@/hooks/useOpportunityRecommendations";

export function OpportunityCard({
  opportunity,
  matchScore,
  recommendation,
  ctaOverride,
}: {
  opportunity: Opportunity;
  matchScore?: number;
  recommendation?: OpportunityRecommendation;
  /** Persona-aware CTA override (e.g. Venture Creator → "Compare to my venture"). */
  ctaOverride?: { label: string };
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = categoryConfig[opportunity.category];
  const [submitted, setSubmitted] = useState(false);
  const { trust } = useTrust(opportunity.author_user_id ?? null);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  const { reputation } = useReputation(opportunity.author_user_id ?? null);
  const repStyle = reputation ? reputationLevelStyle(reputation.reputation_level) : null;
  const { isSaved, toggle } = useSavedOpportunities(user?.id);
  const saved = isSaved(opportunity.id);

  useEffect(() => {
    if (!user) return;
    (supabase.from("opportunity_interactions" as any) as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("opportunity_id", opportunity.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) setSubmitted(true);
      });
  }, [user, opportunity.id]);

  const goToDetail = () => navigate(opportunity.primary_action.route);

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
            {opportunity.sector && (
              <span className="text-xs text-muted-foreground">{opportunity.sector}</span>
            )}
          </div>
          <button
            onClick={goToDetail}
            className="text-left font-display text-base font-semibold text-foreground leading-tight hover:text-primary transition-colors"
          >
            {opportunity.title}
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`shrink-0 flex items-center justify-center rounded-full w-11 h-11 text-xs font-bold border ${
                    matchScore >= 75
                      ? "bg-b4-teal/10 text-b4-teal border-b4-teal/30"
                      : matchScore >= 40
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {matchScore}%
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-xs space-y-1.5" align="end">
                <p className="font-semibold text-sm text-foreground">Match score {matchScore}%</p>
                {recommendation ? (
                  <>
                    <p className="text-muted-foreground">Confidence {Math.round(recommendation.confidenceScore * 100)}%</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• Expertise +{Math.round(recommendation.expertisePoints)}{recommendation.explanation.skills_match?.matched?.length ? ` — ${recommendation.explanation.skills_match.matched.slice(0, 3).join(", ")}` : ""}</li>
                      <li>• Trust +{Math.round(recommendation.trustPoints)}</li>
                      <li>• Experience +{Math.round(recommendation.experiencePoints)}</li>
                      <li>• Freshness +{Math.round(recommendation.freshnessPoints)}</li>
                    </ul>
                    {recommendation.nextAction && (
                      <p className="pt-1 border-t border-border text-foreground">Next step: {recommendation.nextAction}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Score based on skill tag overlap.</p>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{opportunity.description}</p>

      {recommendation && (matchScore ?? 0) >= 30 && (
        <div className="text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-md px-2.5 py-1.5 mb-3">
          <span className="font-semibold text-foreground">Recommended because: </span>
          Expertise match {Math.round(recommendation.expertisePoints)}
          {recommendation.explanation.skills_match?.matched?.length
            ? ` (${recommendation.explanation.skills_match.matched.slice(0, 3).join(", ")})`
            : ""}
          {trustStyle ? ` · Trust: ${trustStyle.label}` : ""}
          {recommendation.nextAction ? ` · Builds toward: ${recommendation.nextAction}` : ""}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {opportunity.required_skills.slice(0, 5).map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs font-normal px-2 py-0.5">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground min-w-0">
          <span className="font-medium text-foreground truncate">{opportunity.income_range}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="truncate">{opportunity.effort_level}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 hidden sm:inline-block" />
          <span className="hidden sm:flex items-center gap-1 truncate">
            {opportunity.author_name}
            {trustStyle && (
              <span
                className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${trustStyle.className}`}
                title={`Author trust: ${trustStyle.label}`}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                {trustStyle.label}
              </span>
            )}
            {repStyle && reputation && (
              <span className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${repStyle.className}`}>
                {repStyle.label}
              </span>
            )}
          </span>
        </div>

        <Button
          size="sm"
          variant={submitted ? "outline" : "default"}
          onClick={goToDetail}
          className="shrink-0"
        >
          {submitted ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              View status
            </>
          ) : (
            <>
              {ctaOverride?.label ?? opportunity.primary_action.label}
              <ArrowRight className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
