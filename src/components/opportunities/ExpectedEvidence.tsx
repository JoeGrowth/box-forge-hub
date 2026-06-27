// Sprint 5A — "What evidence is expected?"
// Inferred from category + required skills. Tells the applicant what to bring.

import { CheckCircle2 } from "lucide-react";

interface Props {
  category: "job" | "consulting" | "tender" | "startup" | "training";
  requiredSkills?: string[];
  className?: string;
}

const baseExpectations: Record<Props["category"], string[]> = {
  startup: ["Cover note explaining your fit", "Past contributions in this sector", "Time / equity availability"],
  job: ["Resume or profile summary", "Examples of relevant work", "Availability"],
  consulting: ["Service references", "Defined scope or proposal", "Trust signals from past clients"],
  tender: ["Track record in the sector", "Capacity statement", "Pricing or budget alignment"],
  training: ["Learning goal", "Commitment to complete"],
};

export function ExpectedEvidence({ category, requiredSkills = [], className }: Props) {
  const items = [...baseExpectations[category]];
  if (requiredSkills.length > 0) {
    items.unshift(`Skills: ${requiredSkills.slice(0, 4).join(", ")}`);
  }
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
        Evidence expected
      </p>
      <ul className="space-y-0.5">
        {items.slice(0, 3).map((it, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 mt-0.5 text-b4-teal shrink-0" />
            <span className="leading-snug">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
