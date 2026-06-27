// Sprint 4C — Capital Wallet.
// Narrative surface. Portfolio of accumulated capital across five dimensions.
// IMPORTANT: do NOT invent numerical conversions between dimensions.
// No "1 relationship = 100 points". Value system stays multi-dimensional.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, BookOpen, Users, Award, Coins } from "lucide-react";

// Untyped alias to side-step deep generic instantiation in parallel queries.
const sb = supabase as any;

interface Wallet {
  time: { commitments_completed: number; consistency_streak_days: number };
  knowledge: { skills: number; evidence: number };
  network: { relationships: number; introductions: number };
  reputation: { contributions: number; milestones: number };
  ownership: { equity_positions: number; revenue_streams: number };
}

interface Props {
  userId: string;
  className?: string;
}

export function CapitalWallet({ userId, className }: Props) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [
          commitmentsDone,
          checkpoints,
          skills,
          evidence,
          rels,
          contribs,
          milestones,
          equity,
          revenue,
        ] = await Promise.all([
          sb
            .from("commitments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "completed"),
          sb
            .from("commitment_checkpoints")
            .select("created_at")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .limit(60),
          sb
            .from("user_skills")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          sb
            .from("evidence")
            .select("id", { count: "exact", head: true })
            .eq("captured_by", userId),
          sb
            .from("advisor_relationships")
            .select("id", { count: "exact", head: true })
            .or(`advisor_id.eq.${userId},user_id.eq.${userId}`)
            .eq("status", "active"),
          sb
            .from("contributions")
            .select("id", { count: "exact", head: true })
            .eq("actor_id", userId),
          sb
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("achieved_by", userId),
          sb
            .from("equity_allocations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          sb
            .from("revenue_graph")
            .select("user_id")
            .eq("user_id", userId),
        ]);

        if (cancelled) return;

        // Consistency = distinct days with a checkpoint in trailing 30d window.
        const days = new Set<string>();
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        ((checkpoints.data as any[]) ?? []).forEach((r) => {
          const t = new Date(r.created_at).getTime();
          if (t >= cutoff) days.add(String(r.created_at).slice(0, 10));
        });

        setWallet({
          time: {
            commitments_completed: commitmentsDone.count ?? 0,
            consistency_streak_days: days.size,
          },
          knowledge: {
            skills: skills.count ?? 0,
            evidence: evidence.count ?? 0,
          },
          network: {
            relationships: rels.count ?? 0,
            introductions: 0,
          },
          reputation: {
            contributions: contribs.count ?? 0,
            milestones: milestones.count ?? 0,
          },
          ownership: {
            equity_positions: equity.count ?? 0,
            revenue_streams: (revenue.data as any[] | null)?.length ?? 0,
          },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <Skeleton className={`h-72 w-full ${className ?? ""}`} />;
  if (!wallet) return null;

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div>
        <h3 className="text-lg font-semibold">Capital Wallet</h3>
        <p className="text-xs text-muted-foreground">
          A portfolio of accumulated capital. Five dimensions. Not a balance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Bucket
          icon={<Clock className="h-4 w-4" />}
          title="Time Capital"
          lines={[
            { label: "Commitments completed", value: wallet.time.commitments_completed },
            { label: "Active days (30d)", value: wallet.time.consistency_streak_days },
          ]}
        />
        <Bucket
          icon={<BookOpen className="h-4 w-4" />}
          title="Knowledge Capital"
          lines={[
            { label: "Skills", value: wallet.knowledge.skills },
            { label: "Evidence pieces", value: wallet.knowledge.evidence },
          ]}
        />
        <Bucket
          icon={<Users className="h-4 w-4" />}
          title="Network Capital"
          lines={[
            { label: "Active relationships", value: wallet.network.relationships },
            { label: "Introductions made", value: wallet.network.introductions },
          ]}
        />
        <Bucket
          icon={<Award className="h-4 w-4" />}
          title="Reputation Capital"
          lines={[
            { label: "Verified contributions", value: wallet.reputation.contributions },
            { label: "Milestones earned", value: wallet.reputation.milestones },
          ]}
        />
        <Bucket
          icon={<Coins className="h-4 w-4" />}
          title="Ownership Capital"
          lines={[
            { label: "Equity positions", value: wallet.ownership.equity_positions },
            { label: "Revenue streams", value: wallet.ownership.revenue_streams },
          ]}
        />
      </div>
    </div>
  );
}

function Bucket({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="font-semibold tabular-nums">{l.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
