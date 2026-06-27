import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Sparkles, Trophy, Handshake, Target, Briefcase, Award, CheckCircle2 } from "lucide-react";

interface ActivityRow {
  event_id: string;
  occurred_at: string;
  event_type: string;
  importance: "high" | "medium" | "low";
  summary: string | null;
  primary_entity_type: string | null;
  primary_entity_id: string | null;
  metadata: Record<string, any> | null;
}

const ICONS: Record<string, any> = {
  "milestone.achieved": Trophy,
  milestone_completed: Trophy,
  milestone_reached: Trophy,
  "contribution.recorded": Sparkles,
  "opportunity.accepted": Award,
  "opportunity.created": Briefcase,
  "relationship.formed": Handshake,
  "commitment.completed": CheckCircle2,
  "commitment.created": Target,
};

const IMPORTANCE_TONE: Record<string, string> = {
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

interface Props {
  userId: string;
  limit?: number;
  compact?: boolean;
}

export function ActivityFeed({ userId, limit = 30, compact = false }: Props) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_profile_activity", {
        _user_id: userId,
        _limit: limit,
      });
      if (cancelled) return;
      if (error) console.error("get_profile_activity", error);
      setRows((data as ActivityRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No public activity yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border/60 ml-2 space-y-4">
      {rows.map((r) => {
        const Icon = ICONS[r.event_type] ?? Sparkles;
        const title = r.summary
          ? r.summary.replace(/\b\w/g, (c) => c.toUpperCase())
          : r.event_type.replace(/[._]/g, " ");
        return (
          <li key={r.event_id} className="ml-4">
            <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
              <Icon className="h-2.5 w-2.5 text-primary" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {!compact && (
                <Badge variant="outline" className={`text-[10px] ${IMPORTANCE_TONE[r.importance]}`}>
                  {r.importance}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              {formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityFeedCard({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ActivityFeed userId={userId} />
      </CardContent>
    </Card>
  );
}
