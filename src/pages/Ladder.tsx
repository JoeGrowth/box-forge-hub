import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useProgressionLadder, type LadderStage, type LadderStageKey } from "@/hooks/useProgressionLadder";
import { useAdmin } from "@/hooks/useAdmin";
import { Check, Lock, ArrowRight, Target, Anchor } from "lucide-react";
import { useEffect } from "react";

const SINK_CONTENT: Record<LadderStageKey, { title: string; body: string }> = {
  talent: {
    title: "Stay in Talent Foundation",
    body: "Some people decide to stay at this stage and keep looking for job opportunities. Focus on sharpening your Natural Role, expertise and public profile, then use the Opportunities feed to apply to roles that match your foundation.",
  },
  advisor: {
    title: "Stay in Talent Monetized",
    body: "Some people decide to stay at this stage and keep structuring — detaching by systemizing their consulting practice and scaling it into an asset (Brand Entity). Keep converting missions, document your delivery, and build a repeatable offer.",
  },
  cobuilder: {
    title: "Stay in Co-Builder Mastery",
    body: "Some people decide to stay as career co-builders — joining founders' teams for equity without initiating their own venture. Keep curating which startups you join, deepen your role, and compound equity across ventures.",
  },
  founder: {
    title: "Stay in Initiation Mastery",
    body: "Some people decide to stay as serial initiators — publishing and validating ideas, recruiting co-builders, and handing off execution. Keep refining your idea pipeline and your ability to attract vaccinated co-builders.",
  },
  box_admin: {
    title: "Stay as Box Admin",
    body: "Some people decide to stay running a vertical Box — curating advisors, funneling opportunities, and growing the ecosystem in one domain rather than moving to platform-wide administration.",
  },
  platform_admin: {
    title: "Platform Admin",
    body: "Terminal stage — operate the platform across all boxes.",
  },
};

export default function Ladder() {
  const { stages, currentStage, loading } = useProgressionLadder();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    document.title = "Progression Ladder | Box4Solutions";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl flex-1 space-y-6">
        <div className="bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/85 rounded-2xl p-8 text-white">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Your Progression Ladder</h1>
          <p className="text-white/80 max-w-2xl mb-4">
            Six stages from Talent to Platform Admin. Each stage unlocks the next once its target is hit.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm">
            <Target className="w-4 h-4" />
            Currently on <span className="font-semibold">Stage {currentStage.index} · {currentStage.label}</span>
          </div>
        </div>

        <div className="space-y-4">
          {stages.map((s) => <StageRow key={s.key} stage={s} isFocus={s.key === currentStage.key} isAdmin={isAdmin} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StageRow({ stage, isFocus, isAdmin }: { stage: LadderStage; isFocus: boolean; isAdmin: boolean }) {
  const pct = stage.target > 0 ? Math.min(100, (stage.current / stage.target) * 100) : 0;
  const state = stage.achieved ? "achieved" : stage.unlocked ? "active" : "locked";

  const borderClass =
    state === "achieved" ? "border-emerald-500/40" :
    state === "active" ? (isFocus ? "border-primary shadow-lg shadow-primary/10" : "border-primary/30") :
    "border-border";

  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
            state === "achieved" ? "bg-emerald-500/15 text-emerald-600" :
            state === "active" ? "bg-primary/15 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>
            {state === "achieved" ? <Check className="w-5 h-5" /> :
             state === "locked" ? <Lock className="w-4 h-4" /> : stage.index}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage {stage.index}</div>
                <h3 className="font-display text-lg font-bold text-foreground">{stage.label}</h3>
              </div>
              <Badge variant="outline" className={
                state === "achieved" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
                state === "active" ? "bg-primary/10 text-primary border-primary/30" :
                ""
              }>
                {state === "achieved" ? "Achieved" : state === "active" ? `${stage.current} / ${stage.target}` : "Locked"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{stage.intent}</p>
            {state !== "locked" && stage.target > 1 && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div className={`h-full transition-all ${state === "achieved" ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
              </div>
            )}
            {state !== "locked" && (
              <div className="mt-3">
                <Button asChild size="sm" variant={isFocus ? "default" : "outline"}>
                  <Link to={stage.ctaHref}>{stage.ctaLabel} <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
