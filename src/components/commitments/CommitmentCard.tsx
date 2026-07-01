import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, CheckCircle2, AlertTriangle, PlayCircle, Flag } from "lucide-react";
import type { Commitment, CommitmentCheckpoint } from "@/lib/commitments";

interface Props {
  commitment: Commitment;
  checkpoints: CommitmentCheckpoint[];
  contextLabel?: string;
  accountabilityPartner?: string | null;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCheckpoint?: (commitment: Commitment) => void;
  onRecover?: (id: string) => void;
}

const STATUS_LABEL: Record<Commitment["status"], string> = {
  pending: "Waiting",
  active: "Active",
  completed: "Completed",
  failed: "Missed",
  cancelled: "Cancelled",
};

export function CommitmentCard({
  commitment,
  checkpoints,
  contextLabel,
  accountabilityPartner,
  onStart,
  onComplete,
  onCheckpoint,
  onRecover,
}: Props) {
  const { daysRemaining, progressPct } = useMemo(() => {
    if (!commitment.due_at || !commitment.started_at) return { daysRemaining: null, progressPct: 0 };
    const start = new Date(commitment.started_at).getTime();
    const due = new Date(commitment.due_at).getTime();
    const now = Date.now();
    const total = Math.max(1, due - start);
    const elapsed = Math.min(total, Math.max(0, now - start));
    const pct = Math.round((elapsed / total) * 100);
    const remaining = Math.ceil((due - now) / 86400000);
    return { daysRemaining: remaining, progressPct: pct };
  }, [commitment]);

  const checkpointPct = checkpoints.length
    ? Math.round((checkpoints.length / Math.max(1, Math.floor(commitment.duration_days / 7))) * 100)
    : 0;

  const variant: "default" | "secondary" | "destructive" | "outline" =
    commitment.status === "completed" ? "secondary"
    : commitment.status === "failed" ? "destructive"
    : commitment.status === "active" ? "default"
    : "outline";

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground leading-tight break-words">{commitment.title}</h3>
            {contextLabel && (
              <p className="text-xs text-muted-foreground mt-1 break-words">{contextLabel}</p>
            )}
          </div>
          <Badge variant={variant} className="shrink-0 text-[10px] sm:text-xs">{STATUS_LABEL[commitment.status]}</Badge>
        </div>

        {commitment.status === "active" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                {daysRemaining !== null && daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                  : "Due today"}
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
            {checkpoints.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {checkpoints.length} checkpoint{checkpoints.length === 1 ? "" : "s"} logged · {checkpointPct}% of cadence
              </p>
            )}
          </div>
        )}

        {commitment.status === "pending" && (
          <p className="text-xs text-muted-foreground">
            Blocked by start. Begin the {commitment.duration_days}-day window when you're ready.
          </p>
        )}

        {commitment.status === "completed" && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>Milestone recorded. Reputation updated from this contribution.</span>
          </div>
        )}

        {commitment.status === "failed" && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Window closed without completion. Reset the commitment or document what blocked you.</span>
          </div>
        )}

        {accountabilityPartner && (
          <p className="text-xs text-muted-foreground">Accountability: {accountabilityPartner}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {commitment.status === "pending" && (
            <Button size="sm" onClick={() => onStart?.(commitment.id)}>
              <PlayCircle className="w-4 h-4 mr-1.5" /> Start
            </Button>
          )}
          {commitment.status === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={() => onCheckpoint?.(commitment)}>
                <Flag className="w-4 h-4 mr-1.5" /> Log checkpoint
              </Button>
              <Button size="sm" onClick={() => onComplete?.(commitment.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete
              </Button>
            </>
          )}
          {commitment.status === "failed" && (
            <Button size="sm" variant="outline" onClick={() => onRecover?.(commitment.id)}>
              Reset commitment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
