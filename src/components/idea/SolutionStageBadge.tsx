import { Badge } from "@/components/ui/badge";
import { Lock, AlertTriangle, ShieldCheck } from "lucide-react";

export type SolutionStage = "draft" | "discovery" | "validated";

interface Props {
  stage: SolutionStage | string | null | undefined;
  className?: string;
}

const META: Record<SolutionStage, { label: string; variant: "secondary" | "outline" | "default"; icon: typeof Lock; tone: string }> = {
  draft: {
    label: "Draft · Solution Canvas needed",
    variant: "secondary",
    icon: Lock,
    tone: "text-muted-foreground",
  },
  discovery: {
    label: "Discovery · Solution not validated",
    variant: "outline",
    icon: AlertTriangle,
    tone: "text-amber-600",
  },
  validated: {
    label: "Validated Solution",
    variant: "default",
    icon: ShieldCheck,
    tone: "",
  },
};

export function SolutionStageBadge({ stage, className }: Props) {
  const key = (stage ?? "draft") as SolutionStage;
  const meta = META[key] ?? META.draft;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={`gap-1 ${className ?? ""}`}>
      <Icon className={`h-3 w-3 ${meta.tone}`} />
      <span>{meta.label}</span>
    </Badge>
  );
}
