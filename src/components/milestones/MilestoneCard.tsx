import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, Handshake } from "lucide-react";

/**
 * Enforces the product rule:
 *   Milestone → Contribution that achieved it → Relationship that enabled it.
 * Never render a milestone without these slots — progress comes from collaboration.
 */
export interface MilestoneCardProps {
  milestoneLabel: string;
  achievedAt?: string | null;
  contributionLabel: string;            // impact phrasing, NOT weights
  relationshipLabel: string;            // who / which advisor / which team
  onOpenContribution?: () => void;
  onOpenRelationship?: () => void;
}

export function MilestoneCard({
  milestoneLabel,
  achievedAt,
  contributionLabel,
  relationshipLabel,
  onOpenContribution,
  onOpenRelationship,
}: MilestoneCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Trophy className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground leading-tight">{milestoneLabel}</h3>
              <Badge variant="secondary">Milestone</Badge>
            </div>
            {achievedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Achieved {new Date(achievedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 pl-1 border-l-2 border-border/60 ml-4 pl-4">
          <button
            type="button"
            onClick={onOpenContribution}
            className="flex items-start gap-2 text-left text-sm text-foreground hover:text-primary transition-colors w-full"
          >
            <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <span>
              <span className="text-muted-foreground">via contribution:</span>{" "}
              <span className="font-medium">{contributionLabel}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenRelationship}
            className="flex items-start gap-2 text-left text-sm text-foreground hover:text-primary transition-colors w-full"
          >
            <Handshake className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <span>
              <span className="text-muted-foreground">enabled by:</span>{" "}
              <span className="font-medium">{relationshipLabel}</span>
            </span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
