import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Handshake, Sparkles, Trophy, Users, FlaskConical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedRow {
  occurred_at: string;
  event_type: string;
  user_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
}

const META: Record<string, { label: string; icon: any }> = {
  "idea.solution.validated": { label: "Solution validated", icon: FlaskConical },
  "relationship.formed": { label: "Advisor joined", icon: Handshake },
  "commitment.completed": { label: "Commitment completed", icon: CheckCircle2 },
  "milestone.achieved": { label: "Milestone unlocked", icon: Trophy },
  "contribution.recorded": { label: "Contribution recorded", icon: Sparkles },
  "ritual.instance.completed": { label: "Ritual completed", icon: Sparkles },
  "startup.team.joined": { label: "Team member joined", icon: Users },
  "company.incorporated": { label: "Company incorporated", icon: Trophy },
};

// Impact-only descriptions — never weights, never raw counters.
function describe(r: FeedRow): string {
  const p = r.payload ?? {};
  switch (r.event_type) {
    case "contribution.recorded":
      return p.kind ? `Contributed ${String(p.kind).replace(/_/g, " ")}` : "Recorded a contribution";
    case "milestone.achieved":
      return p.kind ? `Earned milestone: ${String(p.kind).replace(/_/g, " ")}` : "Earned a milestone";
    case "commitment.completed":
      return p.title ? `Completed: ${p.title}` : "Completed a commitment";
    case "idea.solution.validated":
      return "Validated their Solution Canvas";
    case "relationship.formed":
      return "Started an advisor relationship";
    case "ritual.instance.completed":
      return "Completed a ritual";
    default:
      return META[r.event_type]?.label ?? r.event_type;
  }
}

export function BoxFeed({ boxId, boxSlug }: { boxId?: string | null; boxSlug?: string | null }) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let resolvedId: string | null = boxId ?? null;
      if (!resolvedId && boxSlug) {
        const { data } = await supabase.from("boxes").select("id").eq("slug", boxSlug).maybeSingle();
        resolvedId = (data as any)?.id ?? null;
      }
      const { data, error } = await supabase.rpc("get_box_feed", { _box_id: resolvedId, _limit: 30 });
      if (!cancelled) {
        if (error) console.error(error);
        setRows((data as FeedRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [boxId, boxSlug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Box feed</CardTitle>
        <p className="text-sm text-muted-foreground">Validated solutions, contributions, milestones and team formations — no noise.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. The first validated solution will appear here.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => {
              const meta = META[r.event_type] ?? { label: r.event_type, icon: Sparkles };
              const Icon = meta.icon;
              return (
                <li key={`${r.event_type}-${r.aggregate_id}-${i}`} className="py-3 flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{describe(r)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
