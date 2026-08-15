import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Flag,
  RotateCcw,
  XCircle,
  Clock,
} from "lucide-react";
import type { Commitment, CommitmentCheckpoint } from "@/lib/commitments";
import { cn } from "@/lib/utils";

interface Props {
  commitment: Commitment;
  checkpoints: CommitmentCheckpoint[];
  contextLabel?: string;
  accountabilityPartner?: string | null;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCheckpoint?: (commitment: Commitment) => void;
  onCancel?: (id: string) => void;
  onRecover?: (id: string) => void;
}

const STATUS_META: Record<
  Commitment["status"],
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pending: {
    label: "Waiting",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  active: {
    label: "Active",
    icon: PlayCircle,
    color: "text-b4-teal",
    bg: "bg-b4-teal/10",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  failed: {
    label: "Missed",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

const BORDER_CLASS: Record<Commitment["status"], string> = {
  pending: "border-l-4 border-l-muted-foreground/30",
  active: "border-l-4 border-l-b4-teal",
  completed: "border-l-4 border-l-primary",
  failed: "border-l-4 border-l-destructive",
  cancelled: "border-l-4 border-l-muted-foreground/30",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysUntil(dueIso: string | null) {
  if (!dueIso) return null;
  const due = new Date(dueIso).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / 86400000);
}

export function CommitmentCard({
  commitment,
  checkpoints,
  contextLabel,
  accountabilityPartner,
  onStart,
  onComplete,
  onCheckpoint,
  onCancel,
  onRecover,
}: Props) {
  const meta = STATUS_META[commitment.status];
  const StatusIcon = meta.icon;
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(false);

  const { daysRemaining, progressPct } = useMemo(() => {
    if (!commitment.due_at || !commitment.started_at)
      return { daysRemaining: daysUntil(commitment.due_at), progressPct: 0 };
    const start = new Date(commitment.started_at).getTime();
    const due = new Date(commitment.due_at).getTime();
    const now = Date.now();
    const total = Math.max(1, due - start);
    const elapsed = Math.min(total, Math.max(0, now - start));
    return {
      daysRemaining: Math.ceil((due - now) / 86400000),
      progressPct: Math.round((elapsed / total) * 100),
    };
  }, [commitment]);

  const sortedCheckpoints = useMemo(
    () =>
      [...checkpoints].sort(
        (a, b) =>
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      ),
    [checkpoints]
  );

  const remainingText = useMemo(() => {
    if (daysRemaining === null) return "No deadline set";
    if (daysRemaining > 0) return `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;
    if (daysRemaining === 0) return "Due today";
    const overdue = Math.abs(daysRemaining);
    return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  }, [daysRemaining]);

  const remainingColor =
    daysRemaining === null
      ? "text-muted-foreground"
      : daysRemaining > 3
      ? "text-b4-teal"
      : daysRemaining > 0
      ? "text-b4-coral"
      : "text-destructive";

  return (
    <Card
      className={cn(
        "border-border/60 transition-all hover:shadow-sm overflow-hidden",
        BORDER_CLASS[commitment.status]
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground leading-tight break-words">
              {commitment.title}
            </h3>
            {commitment.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {commitment.description}
              </p>
            )}
            {contextLabel && (
              <p className="text-xs text-muted-foreground mt-1 break-words">
                {contextLabel}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1.5 text-[10px] sm:text-xs border-transparent",
              meta.bg,
              meta.color
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {meta.label}
          </Badge>
        </div>

        {commitment.status === "active" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className={cn("flex items-center gap-1.5 font-medium", remainingColor)}>
                <CalendarClock className="w-3.5 h-3.5" />
                {remainingText}
              </span>
              <span className="text-muted-foreground">{progressPct}% elapsed</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Checkpoints
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {sortedCheckpoints.length} logged
                </span>
              </div>

              {sortedCheckpoints.length > 0 ? (
                <>
                  <ol className="relative space-y-3 pl-4 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
                    {(showAllCheckpoints
                      ? sortedCheckpoints
                      : sortedCheckpoints.slice(0, 3)
                    ).map((cp, i) => (
                      <li key={cp.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-4 top-1 w-[11px] h-[11px] rounded-full border-2 border-background",
                            i === 0 && !showAllCheckpoints
                              ? "bg-b4-teal"
                              : "bg-b4-teal/40"
                          )}
                        />
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-medium text-foreground break-words">
                            {cp.label}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            Day {cp.day_offset} · {formatDate(cp.completed_at)}
                          </span>
                        </div>
                        {cp.note && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 break-words">
                            {cp.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                  {sortedCheckpoints.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCheckpoints((v) => !v)}
                      className="mt-2 text-[11px] font-medium text-b4-teal hover:underline"
                    >
                      {showAllCheckpoints
                        ? "Show less"
                        : `Show ${sortedCheckpoints.length - 3} earlier checkpoint${
                            sortedCheckpoints.length - 3 === 1 ? "" : "s"
                          }`}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    No checkpoints yet. Log one to keep momentum.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {commitment.status === "pending" && (
          <p className="text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            {commitment.duration_days}-day window. Start when you are ready.
          </p>
        )}

        {commitment.status === "completed" && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>
              Milestone recorded
              {commitment.completed_at && ` · ${formatDate(commitment.completed_at)}`}. Reputation
              updated from this contribution.
            </span>
          </div>
        )}

        {commitment.status === "failed" && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {commitment.due_at
                ? `Missed deadline · ${formatDate(commitment.due_at)}`
                : "Window closed without completion."}{" "}
              Reset to try again or document what blocked you.
            </span>
          </div>
        )}

        {commitment.status === "cancelled" && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Cancelled {commitment.cancelled_at && `· ${formatDate(commitment.cancelled_at)}`}.
              Restart when the commitment is relevant again.
            </span>
          </div>
        )}

        {accountabilityPartner && (
          <p className="text-xs text-muted-foreground">
            Accountability: {accountabilityPartner}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {commitment.status === "pending" && (
            <>
              <Button size="sm" onClick={() => onStart?.(commitment.id)}>
                <PlayCircle className="w-4 h-4 mr-1.5" /> Start
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onCancel?.(commitment.id)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
            </>
          )}
          {commitment.status === "active" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheckpoint?.(commitment)}
              >
                <Flag className="w-4 h-4 mr-1.5" /> Log checkpoint
              </Button>
              <Button size="sm" onClick={() => onComplete?.(commitment.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onCancel?.(commitment.id)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
            </>
          )}
          {(commitment.status === "failed" || commitment.status === "cancelled") && (
            <Button size="sm" variant="outline" onClick={() => onRecover?.(commitment.id)}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Restart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
