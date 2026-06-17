// P0.4 — Shared recommendation explanation surface.
// Every recommendation surface (Dashboard, Profile growth path, Opportunity
// card) consumes this component so the formatting of reasons, missing
// signals, and target stage is identical across the platform.

import { CheckCircle2, Target, AlertCircle } from "lucide-react";

export interface RecommendationExplanation {
  /** Positive reasons the recommendation fires (already-met signals). */
  reasons?: string[];
  /** Missing signals required to unlock the next stage. */
  missing?: string[];
  /** Target progression stage this recommendation advances toward. */
  targetStage?: string | null;
  /** Optional numeric score 0-100 for display. */
  score?: number | null;
}

interface Props {
  data: RecommendationExplanation;
  compact?: boolean;
  className?: string;
}

export function RecommendationExplanationView({ data, compact, className }: Props) {
  const reasons = data.reasons ?? [];
  const missing = data.missing ?? [];

  if (reasons.length === 0 && missing.length === 0 && !data.targetStage) {
    return null;
  }

  return (
    <div className={`text-xs space-y-1 ${className ?? ""}`}>
      {reasons.length > 0 && (
        <div className="space-y-0.5">
          {!compact && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold">
              Because
            </div>
          )}
          <ul className="space-y-0.5">
            {reasons.slice(0, compact ? 2 : 4).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mt-0.5 text-b4-teal shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-0.5">
          {!compact && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold">
              To unlock next
            </div>
          )}
          <ul className="space-y-0.5">
            {missing.slice(0, compact ? 2 : 3).map((m, i) => (
              <li key={i} className="flex items-start gap-1.5 text-b4-coral">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.targetStage && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary pt-0.5">
          <Target className="w-3 h-3" />
          <span>Advances toward <span className="font-medium capitalize">{data.targetStage}</span></span>
        </div>
      )}
    </div>
  );
}

/**
 * Build a canonical RecommendationExplanation from a progression `NextBestAction`.
 * Centralises the mapping so Dashboard + Profile produce identical reason lists.
 */
export function fromNextBestAction(a: {
  reason: Record<string, unknown>;
  required_signals?: Record<string, unknown>;
  target_stage?: string;
}): RecommendationExplanation {
  const r = a.reason ?? {};
  const reasons: string[] = [];
  if (typeof r.verified_expertise === "number" && r.verified_expertise > 0) {
    reasons.push(`${r.verified_expertise} verified credential${r.verified_expertise === 1 ? "" : "s"}`);
  }
  if (typeof r.expertise_score === "number" && r.expertise_score > 0) {
    reasons.push(`Expertise score ${Math.round(r.expertise_score as number)}`);
  }
  if (typeof r.trust_score === "number" && r.trust_score > 0) {
    reasons.push(`Trust score ${Math.round(r.trust_score as number)}`);
  }
  if (typeof r.completed_transactions === "number" && r.completed_transactions > 0) {
    reasons.push(`${r.completed_transactions} completed engagement${r.completed_transactions === 1 ? "" : "s"}`);
  }
  if (typeof r.reputation_level === "string" && r.reputation_level !== "verified") {
    reasons.push(`Reputation: ${r.reputation_level}`);
  }
  if (typeof r.ownership_level === "string" && r.ownership_level !== "none") {
    reasons.push(`Ownership: ${(r.ownership_level as string).replace(/_/g, " ")}`);
  }

  const cond = a.required_signals ?? {};
  const missing: string[] = [];
  const need = (k: string) => Number(cond[k] ?? 0);
  const have = (k: string) => Number(r[k] ?? 0);
  if (need("verified_expertise_min") && have("verified_expertise") < need("verified_expertise_min")) {
    missing.push(`${need("verified_expertise_min") - have("verified_expertise")} more verified credential(s)`);
  }
  if (need("trust_score_min") && have("trust_score") < need("trust_score_min")) {
    missing.push(`Reach trust score ${need("trust_score_min")}`);
  }
  if (need("completed_transactions_min") && have("completed_transactions") < need("completed_transactions_min")) {
    missing.push(`Complete ${need("completed_transactions_min") - have("completed_transactions")} more engagement(s)`);
  }
  if (need("reputation_score_min") && have("reputation_score") < need("reputation_score_min")) {
    missing.push(`Reach reputation ${need("reputation_score_min")}`);
  }

  return { reasons, missing, targetStage: a.target_stage ?? null };
}

/**
 * Build a canonical RecommendationExplanation from an `opportunity_graph`
 * projection row (the one OpportunityCard already consumes).
 */
export function fromOpportunityProjection(row: {
  explanation: Record<string, unknown>;
  expertisePoints: number;
  trustPoints: number;
  experiencePoints: number;
  freshnessPoints: number;
}): RecommendationExplanation {
  const exp = row.explanation ?? {};
  const reasons: string[] = [];
  const sm = (exp.skills_match ?? {}) as Record<string, unknown>;
  const matched = (sm.matched ?? []) as string[];
  if (matched.length > 0) reasons.push(`${matched.length} matching skill${matched.length === 1 ? "" : "s"}: ${matched.slice(0, 4).join(", ")}`);
  if (row.trustPoints > 0) reasons.push(((exp.trust as Record<string, unknown>)?.reason as string) ?? `Trust contribution +${Math.round(row.trustPoints)}`);
  if (row.experiencePoints > 0) reasons.push(((exp.experience as Record<string, unknown>)?.reason as string) ?? `Experience +${Math.round(row.experiencePoints)}`);
  if (row.freshnessPoints > 0) reasons.push(((exp.freshness as Record<string, unknown>)?.reason as string) ?? `Recently posted`);
  return { reasons };
}
