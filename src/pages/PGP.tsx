// PGP — Progression Status panel.
// Shows current stage, all stage thresholds, and exact signals missing
// to reach the next stage. Logic mirrors recompute_progression in
// supabase/migrations/20260617004001 so the UI is causally faithful.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNextBestActions, progressionStageLabel } from "@/hooks/useNextBestActions";

type Signals = {
  expertise_score: number;
  verified_expertise_count: number;
  trust_score: number;
  completed_transactions: number;
  reputation_score: number;
  reputation_level: string;
  ownership_level: string;
  total_allocated_equity: number;
};

const STAGES = ["novice", "emerging", "capable", "monetizing", "building", "founder"] as const;
type Stage = (typeof STAGES)[number];

type Threshold = {
  stage: Stage;
  label: string;
  description: string;
  // OR-list of clauses, each clause is an AND-list of atomic checks
  clauses: Array<Array<{ key: keyof Signals; op: ">=" | ">" | "in"; value: number | string[]; label: string }>>;
};

// Mirrors the CASE in recompute_progression (top-down).
const STAGE_RULES: Threshold[] = [
  {
    stage: "founder",
    label: "Founder",
    description: "Significant equity ownership or recognised authority.",
    clauses: [
      [{ key: "total_allocated_equity", op: ">=", value: 15, label: "Allocated equity ≥ 15%" }],
      [{ key: "reputation_level", op: "in", value: ["authority"], label: "Reputation level = authority" }],
    ],
  },
  {
    stage: "building",
    label: "Building",
    description: "You hold equity or are recognised as an expert.",
    clauses: [
      [{ key: "total_allocated_equity", op: ">", value: 0, label: "Any allocated equity" }],
      [{ key: "reputation_level", op: "in", value: ["expert", "recognized"], label: "Reputation level ∈ {expert, recognized}" }],
    ],
  },
  {
    stage: "monetizing",
    label: "Monetizing",
    description: "At least one completed paid transaction.",
    clauses: [[{ key: "completed_transactions", op: ">", value: 0, label: "Completed transactions ≥ 1" }]],
  },
  {
    stage: "capable",
    label: "Capable",
    description: "Verified expertise or a strong expertise score.",
    clauses: [
      [{ key: "verified_expertise_count", op: ">", value: 0, label: "Verified expertise ≥ 1" }],
      [{ key: "expertise_score", op: ">=", value: 8, label: "Expertise score ≥ 8" }],
    ],
  },
  {
    stage: "emerging",
    label: "Emerging",
    description: "Any expertise signal in the graph.",
    clauses: [[{ key: "expertise_score", op: ">", value: 0, label: "Expertise score > 0" }]],
  },
  {
    stage: "novice",
    label: "Novice",
    description: "Starting point — no signals yet.",
    clauses: [],
  },
];

function evalAtom(s: Signals, atom: Threshold["clauses"][number][number]): boolean {
  const v = s[atom.key];
  if (atom.op === ">=") return Number(v) >= (atom.value as number);
  if (atom.op === ">") return Number(v) > (atom.value as number);
  if (atom.op === "in") return (atom.value as string[]).includes(String(v));
  return false;
}

function currentValue(s: Signals, atom: Threshold["clauses"][number][number]): string {
  return String(s[atom.key]);
}

export default function PGP() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { progression, loading: progLoading } = useNextBestActions(user?.id);
  const [signals, setSignals] = useState<Signals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [exp, trust, rev, rep, own] = await Promise.all([
        supabase.from("expertise_graph").select("expertise_score,verified_expertise_count").eq("user_id", user.id).maybeSingle(),
        supabase.from("trust_graph").select("trust_score").eq("user_id", user.id).maybeSingle(),
        supabase.from("revenue_graph").select("completed_value_count").eq("user_id", user.id).maybeSingle(),
        supabase.from("reputation_graph").select("reputation_score,reputation_level").eq("user_id", user.id).maybeSingle(),
        supabase.from("ownership_graph").select("ownership_level,total_allocated_equity").eq("user_id", user.id).maybeSingle(),
      ]);
      setSignals({
        expertise_score: Number(exp.data?.expertise_score ?? 0),
        verified_expertise_count: Number(exp.data?.verified_expertise_count ?? 0),
        trust_score: Number(trust.data?.trust_score ?? 0),
        completed_transactions: Number(rev.data?.completed_value_count ?? 0),
        reputation_score: Number(rep.data?.reputation_score ?? 0),
        reputation_level: String(rep.data?.reputation_level ?? "verified"),
        ownership_level: String(own.data?.ownership_level ?? "none"),
        total_allocated_equity: Number(own.data?.total_allocated_equity ?? 0),
      });
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || !user) return null;

  const currentStage = (progression?.current_state as Stage) ?? "novice";
  const currentIdx = STAGES.indexOf(currentStage);
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const nextRule = nextStage ? STAGE_RULES.find((r) => r.stage === nextStage)! : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24 pb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <header>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <h1 className="font-display text-3xl font-bold">Progression Status</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your current stage, the thresholds for every stage, and exactly which signals are missing
              to reach the next one. Logic is read straight from the progression engine.
            </p>
          </header>

          {loading || progLoading || !signals || !progression ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <>
              {/* Current state */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-b4-coral/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Current stage</CardTitle>
                    <Badge variant="outline">Score {Math.round(progression.progression_score)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">
                    {progressionStageLabel[currentStage]}
                  </div>
                  <Progress value={progression.progression_score} className="h-2" />
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {STAGES.map((s, i) => {
                      const reached = i <= currentIdx;
                      const current = i === currentIdx;
                      return (
                        <div
                          key={s}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${
                            current
                              ? "bg-primary text-primary-foreground border-primary"
                              : reached
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {progressionStageLabel[s]}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Next stage gap */}
              {nextRule && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-b4-teal" />
                      <CardTitle className="text-base">
                        Missing signals to reach {progressionStageLabel[nextRule.stage]}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextRule.description} Any one of the clauses below is sufficient.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nextRule.clauses.map((clause, ci) => {
                      const clauseOk = clause.every((a) => evalAtom(signals, a));
                      return (
                        <div
                          key={ci}
                          className={`rounded-xl border p-4 ${
                            clauseOk ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                          }`}
                        >
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Option {ci + 1} {clauseOk && "— met"}
                          </div>
                          <ul className="space-y-2">
                            {clause.map((atom, ai) => {
                              const ok = evalAtom(signals, atom);
                              return (
                                <li key={ai} className="flex items-start gap-2 text-sm">
                                  {ok ? (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <div className={ok ? "text-foreground" : "font-medium text-foreground"}>
                                      {atom.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Current: <span className="font-mono">{currentValue(signals, atom)}</span>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* All thresholds */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All stage thresholds</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Evaluated top-down. The highest matching stage becomes your current state.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STAGE_RULES.map((rule) => {
                    const matched =
                      rule.clauses.length === 0
                        ? true
                        : rule.clauses.some((c) => c.every((a) => evalAtom(signals, a)));
                    const isCurrent = rule.stage === currentStage;
                    return (
                      <div
                        key={rule.stage}
                        className={`rounded-xl border p-4 ${
                          isCurrent ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-foreground">
                            {progressionStageLabel[rule.stage]}
                          </div>
                          <Badge variant={matched ? "default" : "outline"} className="text-[10px]">
                            {matched ? "Threshold met" : "Not met"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                        {rule.clauses.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {rule.clauses.map((c, i) => (
                              <div key={i}>
                                · {c.map((a) => a.label).join(" AND ")}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Raw signal snapshot */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signal snapshot</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Live values pulled from your six graphs.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {[
                      ["Expertise score", signals.expertise_score],
                      ["Verified expertise", signals.verified_expertise_count],
                      ["Trust score", signals.trust_score],
                      ["Completed tx", signals.completed_transactions],
                      ["Reputation score", signals.reputation_score],
                      ["Reputation level", signals.reputation_level],
                      ["Ownership level", signals.ownership_level],
                      ["Allocated equity %", signals.total_allocated_equity],
                    ].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg border border-border p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
                        <div className="font-mono text-sm text-foreground">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
