import { Link } from "react-router-dom";
import { ArrowRight, Target, Lock, Check } from "lucide-react";
import { useProgressionLadder, type LadderStageKey } from "@/hooks/useProgressionLadder";

// Compact "next goal" banner. Drop on any stage-specific page and it will
// render only when the ladder's current focus matches the pageStage.
// Passing no pageStage shows the current focus wherever mounted.

interface NextGoalBannerProps {
  pageStage?: LadderStageKey;
  className?: string;
}

export function NextGoalBanner({ pageStage, className = "" }: NextGoalBannerProps) {
  const { nextGoal, stages, loading } = useProgressionLadder();
  if (loading) {
    // Reserve invisible space to avoid a layout-shift flash once the ladder resolves.
    return <div className={`h-[92px] ${className}`} aria-hidden />;
  }



  const stage = pageStage ? stages.find((s) => s.key === pageStage) : nextGoal;
  if (!stage) return null;
  if (stage.achieved) {
    return (
      <div className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-emerald-700/80">Stage {stage.index} unlocked</div>
          <p className="text-sm font-semibold text-foreground">{stage.label} achieved</p>
        </div>
        <Link to="/ladder" className="text-xs text-emerald-700 hover:underline whitespace-nowrap">See ladder →</Link>
      </div>
    );
  }
  if (!stage.unlocked) {
    return (
      <div className={`rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <Lock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage {stage.index} locked</div>
          <p className="text-sm font-medium text-foreground">{stage.label}</p>
          <p className="text-xs text-muted-foreground">{stage.intent}</p>
        </div>
      </div>
    );
  }

  const pct = stage.target > 0 ? Math.min(100, (stage.current / stage.target) * 100) : 0;
  return (
    <div className={`rounded-xl border border-primary/30 bg-primary/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-primary/80">Stage {stage.index} · Next goal</div>
              <p className="text-sm font-semibold text-foreground">{stage.label}</p>
            </div>
            <span className="text-xs font-mono text-foreground">{stage.current} / {stage.target}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stage.intent}</p>
          <div className="w-full h-1.5 rounded-full bg-primary/10 overflow-hidden mt-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link to={stage.ctaHref} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              {stage.ctaLabel} <ArrowRight className="w-3 h-3" />
            </Link>
            <Link to="/ladder" className="text-xs text-muted-foreground hover:text-foreground">Full ladder</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
