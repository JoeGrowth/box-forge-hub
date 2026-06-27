import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Flag, Handshake, Sparkles, Target, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TimelineRow {
  occurred_at: string;
  event_type: string;
  user_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
}

const LABEL: Record<string, { title: string; icon: any }> = {
  "relationship.formed": { title: "Advisor relationship formed", icon: Handshake },
  "commitment.created": { title: "Commitment created", icon: Target },
  "commitment.started": { title: "Commitment started", icon: Target },
  "commitment.checkpoint.completed": { title: "Checkpoint logged", icon: Flag },
  "commitment.completed": { title: "Commitment completed", icon: CheckCircle2 },
  "commitment.failed": { title: "Commitment missed", icon: Flag },
  "milestone.achieved": { title: "Milestone achieved", icon: Trophy },
  "contribution.recorded": { title: "Contribution recorded", icon: Sparkles },
};

export function RelationshipTimeline({ relationshipId }: { relationshipId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_relationship_timeline", { _rel_id: relationshipId });
      if (!cancelled) {
        if (error) console.error(error);
        setRows((data as TimelineRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [relationshipId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relationship timeline</CardTitle>
        <p className="text-xs text-muted-foreground">Professional record of collaboration.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No graph events yet.</p>
        ) : (
          <ol className="relative border-l border-border/60 ml-2 space-y-5">
            {rows.map((r, i) => {
              const meta = LABEL[r.event_type] ?? { title: r.event_type, icon: Sparkles };
              const Icon = meta.icon;
              const detail = r.payload?.label || r.payload?.title || r.payload?.kind;
              return (
                <li key={`${r.event_type}-${r.aggregate_id}-${i}`} className="ml-4">
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
                    <Icon className="h-2.5 w-2.5 text-primary" />
                  </span>
                  <p className="text-sm font-medium text-foreground">{meta.title}</p>
                  {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                    {formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true })}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
