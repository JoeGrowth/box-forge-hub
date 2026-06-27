// Sprint 5A — "What relationship could result?"
// Maps an opportunity category to the relationship_kind that would form on acceptance.

import { Handshake } from "lucide-react";

type Category = "job" | "consulting" | "tender" | "startup" | "training";

const map: Record<Category, { kind: string; description: string }> = {
  startup: { kind: "Teammate", description: "Join as a co-builder with equity and shared ownership." },
  job: { kind: "Hire", description: "Employment relationship with the hiring organization." },
  consulting: { kind: "Client engagement", description: "Time-bound consulting relationship." },
  tender: { kind: "Contractor", description: "Project-based contractual relationship." },
  training: { kind: "Learner", description: "Learning relationship with the trainer or program." },
};

interface Props {
  category: Category;
  className?: string;
}

export function ResultingRelationship({ category, className }: Props) {
  const r = map[category];
  return (
    <div className={`flex items-start gap-1.5 text-xs ${className ?? ""}`}>
      <Handshake className="w-3 h-3 mt-0.5 text-primary shrink-0" />
      <div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mr-1">
          Becomes
        </span>
        <span className="font-medium text-foreground">{r.kind}</span>
        <span className="text-muted-foreground"> — {r.description}</span>
      </div>
    </div>
  );
}
