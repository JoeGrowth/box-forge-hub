import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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

export function OpportunityCard({ opportunity, matchScore }: { opportunity: Opportunity; matchScore?: number }) {
  const navigate = useNavigate();
  const config = categoryConfig[opportunity.category];

  const handleAction = () => {
    if (opportunity.primary_action.route.startsWith("/")) {
      navigate(opportunity.primary_action.route);
    }
  };

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
          <h3 className="font-display text-base font-semibold text-foreground leading-tight">{opportunity.title}</h3>
        </div>

        {/* Match score badge */}
        {matchScore != null && matchScore > 0 && (
          <div
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
          <span>{opportunity.author_name}</span>
        </div>
        <Button size="sm" variant="default" onClick={handleAction} className="shrink-0">
          {opportunity.primary_action.label}
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
