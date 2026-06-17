import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface Opportunity {
  id: string;
  title: string;
  category: "job" | "consulting" | "tender" | "startup" | "training";
  required_skills: string[];
  income_range: string;
  effort_level: string;
  description: string;
  primary_action: { type: "apply" | "join" | "start"; label: string; route: string };
  source_id: string;
  created_at: string;
  author_name: string;
  /** Author user_id — used to surface a Trust indicator on the card. Optional. */
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

const actionTypeMap: Record<string, string> = {
  apply: "apply",
  join: "join",
  start: "request_contact",
};

import type { OpportunityRecommendation } from "@/hooks/useOpportunityRecommendations";

export function OpportunityCard({
  opportunity,
  matchScore,
  recommendation,
}: {
  opportunity: Opportunity;
  matchScore?: number;
  /** Optional projection row from opportunity_graph providing explanation + next action. */
  recommendation?: OpportunityRecommendation;
}) {
  const { user } = useAuth();
  const config = categoryConfig[opportunity.category];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Display-only trust signal sourced from the trust_graph projection.
  // Phase 2: do not factor trust into ranking — that belongs to Opportunity Graph.
  const { trust } = useTrust(opportunity.author_user_id ?? null);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  // Phase 5: candidate reputation indicator. Display-only synthesis surface.
  const { reputation } = useReputation(opportunity.author_user_id ?? null);
  const repStyle = reputation ? reputationLevelStyle(reputation.reputation_level) : null;


  useEffect(() => {
    if (!user) return;
    supabase
      .from("opportunity_interactions" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("opportunity_id", opportunity.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSubmitted(true);
      });
  }, [user, opportunity.id]);

  const handleAction = () => {
    if (submitted) return;
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const actionType = actionTypeMap[opportunity.primary_action.type] || "apply";

    const { error } = await (supabase.from("opportunity_interactions" as any) as any).insert({
      user_id: user.id,
      opportunity_id: opportunity.id,
      action_type: actionType,
      message: message.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        setSubmitted(true);
        toast.info("Already submitted.");
      } else {
        toast.error("Submission failed.");
      }
    } else {
      setSubmitted(true);
      toast.success("Submitted.");
    }
    setSubmitting(false);
    setDialogOpen(false);
    setMessage("");
  };

  return (
    <>
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
            <h3 className="font-display text-base font-semibold text-foreground leading-tight">{opportunity.title}</h3>
          </div>

          {matchScore != null && (
            <div
              title={
                recommendation
                  ? [
                      `Match score ${Math.round(recommendation.matchScore)} (confidence ${Math.round(recommendation.confidenceScore * 100)}%)`,
                      `• Expertise +${Math.round(recommendation.expertisePoints)} ${recommendation.explanation.skills_match?.matched?.length ? `(${recommendation.explanation.skills_match.matched.join(", ")})` : ""}`,
                      `• Trust +${Math.round(recommendation.trustPoints)} — ${recommendation.explanation.trust?.reason ?? ""}`,
                      `• Experience +${Math.round(recommendation.experiencePoints)} — ${recommendation.explanation.experience?.reason ?? ""}`,
                      `• Freshness +${Math.round(recommendation.freshnessPoints)} — ${recommendation.explanation.freshness?.reason ?? ""}`,
                      `Next step: ${recommendation.nextAction}`,
                    ].join("\n")
                  : undefined
              }
              className={`shrink-0 flex items-center justify-center rounded-full w-11 h-11 text-xs font-bold border ${
                matchScore >= 75
                  ? "bg-b4-teal/10 text-b4-teal border-b4-teal/30"
                  : matchScore >= 40
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {matchScore}%
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{opportunity.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {opportunity.required_skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs font-normal px-2 py-0.5">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{opportunity.income_range}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>{opportunity.effort_level}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1">
              {opportunity.author_name}
              {trustStyle && (
                <span
                  className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${trustStyle.className}`}
                  title={`Author trust: ${trustStyle.label}${trust ? ` (${Math.round(trust.score)})` : ""}`}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {trustStyle.label}
                </span>
              )}
              {repStyle && reputation && (
                <span
                  className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${repStyle.className}`}
                  title={`Reputation: ${repStyle.label} (${Math.round(reputation.reputation_score)}). ${reputation.achievement_count} validated achievements.`}
                >
                  {repStyle.label}
                </span>
              )}
            </span>
          </div>

          <Button
            size="sm"
            variant={submitted ? "outline" : "default"}
            onClick={handleAction}
            disabled={submitted}
            className="shrink-0"
          >
            {submitted ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Submitted
              </>
            ) : (
              <>
                {opportunity.primary_action.label}
                <ArrowRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{opportunity.primary_action.label}: {opportunity.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Your profile information will be shared with this opportunity.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
