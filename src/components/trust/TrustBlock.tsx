// Sprint 4B — Trust Block.
// Portable identity layer. Renders EVIDENCE, never raw scores.
// Mount everywhere a person appears: idea team, opportunity, negotiation,
// advisor list, chat header.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Award, Users, Briefcase } from "lucide-react";

interface TrustBlockData {
  natural_role: string | null;
  top_skills: string[];
  verified_contributions: number;
  milestones_earned: number;
  active_relationships: number;
  track_record_density: number | null;
}

interface Props {
  userId: string;
  variant?: "full" | "compact" | "inline";
  className?: string;
}

export function TrustBlock({ userId, variant = "compact", className }: Props) {
  const [data, setData] = useState<TrustBlockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [
          profileRes,
          skillsRes,
          contribRes,
          milestonesRes,
          relRes,
          trackRes,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("natural_role")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("user_skills")
            .select("skill_id, skill_tags(name)")
            .eq("user_id", userId)
            .limit(5),
          supabase
            .from("contributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("advisor_relationships")
            .select("id", { count: "exact", head: true })
            .or(`advisor_id.eq.${userId},user_id.eq.${userId}`)
            .eq("status", "active"),
          supabase
            .from("entrepreneurial_onboarding")
            .select("completion_score")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        setData({
          natural_role: (profileRes.data as any)?.natural_role ?? null,
          top_skills:
            (skillsRes.data ?? [])
              .map((r: any) => r.skill_tags?.name)
              .filter(Boolean) ?? [],
          verified_contributions: contribRes.count ?? 0,
          milestones_earned: milestonesRes.count ?? 0,
          active_relationships: relRes.count ?? 0,
          track_record_density:
            (trackRes.data as any)?.completion_score ?? null,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <Skeleton className={`h-20 w-full ${className ?? ""}`} />;
  }
  if (!data) return null;

  if (variant === "inline") {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 text-xs ${className ?? ""}`}>
        {data.natural_role && (
          <Badge variant="secondary" className="font-normal">
            {data.natural_role}
          </Badge>
        )}
        {data.verified_contributions > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {data.verified_contributions} verified
          </span>
        )}
        {data.milestones_earned > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Award className="h-3 w-3" />
            {data.milestones_earned} milestones
          </span>
        )}
        {data.active_relationships > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {data.active_relationships} relationships
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Natural role
            </p>
            <p className="text-sm font-medium">
              {data.natural_role ?? "Not yet defined"}
            </p>
          </div>
        </div>

        {data.top_skills.length > 0 && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Top skills
            </p>
            <div className="flex flex-wrap gap-1">
              {data.top_skills.map((s) => (
                <Badge key={s} variant="outline" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Verified contributions" value={data.verified_contributions} />
          <Stat icon={<Award className="h-3.5 w-3.5" />} label="Milestones earned" value={data.milestones_earned} />
          <Stat icon={<Users className="h-3.5 w-3.5" />} label="Active relationships" value={data.active_relationships} />
          <Stat icon={<Briefcase className="h-3.5 w-3.5" />} label="Track record" value={data.track_record_density != null ? `${Math.round(data.track_record_density * 100)}%` : "—"} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
