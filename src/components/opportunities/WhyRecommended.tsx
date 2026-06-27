// Sprint 5A — "Why was this recommended?" evidence chips.
// Pure presentation over OpportunityRecommendation. No numeric weights leak out.

import { Sparkles, Users, ShieldCheck, Clock, Briefcase } from "lucide-react";
import type { OpportunityRecommendation } from "@/hooks/useOpportunityRecommendations";

interface Props {
  recommendation?: OpportunityRecommendation;
  className?: string;
}

export function WhyRecommended({ recommendation, className }: Props) {
  if (!recommendation) return null;
  const chips: { icon: React.ReactNode; label: string }[] = [];
  const skills = recommendation.explanation.skills_match?.matched ?? [];
  if (skills.length > 0) {
    chips.push({
      icon: <Sparkles className="w-3 h-3" />,
      label: `${skills.length} matching skill${skills.length === 1 ? "" : "s"}: ${skills.slice(0, 3).join(", ")}`,
    });
  }
  if (recommendation.trustPoints > 0) {
    chips.push({
      icon: <ShieldCheck className="w-3 h-3" />,
      label: recommendation.explanation.trust?.reason ?? "Trust signals align",
    });
  }
  if (recommendation.experiencePoints > 0) {
    chips.push({
      icon: <Briefcase className="w-3 h-3" />,
      label: recommendation.explanation.experience?.reason ?? "Relevant experience",
    });
  }
  if (recommendation.intentPoints > 0) {
    chips.push({
      icon: <Users className="w-3 h-3" />,
      label: recommendation.explanation.intent?.reason ?? "Matches your stated intent",
    });
  }
  if (recommendation.freshnessPoints > 0) {
    chips.push({
      icon: <Clock className="w-3 h-3" />,
      label: "Recently posted",
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
        Recommended because
      </p>
      <ul className="space-y-0.5">
        {chips.slice(0, 4).map((c, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="text-b4-teal mt-0.5 shrink-0">{c.icon}</span>
            <span className="leading-snug">{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
