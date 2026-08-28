// Projects of the organizations where the user is an editor/admin.
// Shown on the dashboard once "Shape your talent" is complete.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Rocket, ArrowRight, CalendarDays, User } from "lucide-react";

type Row = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  lead: string | null;
  target_date: string | null;
  progress: number;
  orgName: string;
  orgSlug: string;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  planned: { label: "Planned", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-primary/10 text-primary border-primary/30" },
  on_hold: { label: "On hold", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

export function MyOrgProjectsCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setRows([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("role, organization:organizations(id, name, slug)")
        .eq("user_id", user.id)
        .in("role", ["editor", "admin"]);

      const orgs = ((memberships as any[]) ?? [])
        .map((m) => m.organization)
        .filter(Boolean) as { id: string; name: string; slug: string }[];

      if (!orgs.length) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }

      const byId = new Map(orgs.map((o) => [o.id, o]));
      const { data: projects } = await supabase
        .from("organization_projects" as any)
        .select("*")
        .in("organization_id", orgs.map((o) => o.id))
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setRows(
        ((projects as any[]) ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          lead: p.lead,
          target_date: p.target_date,
          progress: p.progress ?? 0,
          orgName: byId.get(p.organization_id)?.name ?? "",
          orgSlug: byId.get(p.organization_id)?.slug ?? "",
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!loading && rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="w-5 h-5 text-primary" />
          Your projects
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Projects you can edit across your organizations.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          rows.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.planned;
            return (
              <Link
                key={p.id}
                to={`/org/${p.orgSlug}`}
                className="block rounded-lg border border-border p-4 hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.orgName}
                      {p.lead ? <span className="inline-flex items-center gap-1 ml-2"><User className="w-3 h-3" />{p.lead}</span> : null}
                      {p.target_date ? <span className="inline-flex items-center gap-1 ml-2"><CalendarDays className="w-3 h-3" />{p.target_date}</span> : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress
                    value={p.progress}
                    className="h-2 flex-1"
                    indicatorClassName={cn(
                      p.progress >= 100 ? "bg-emerald-500" : p.progress === 0 ? "bg-muted-foreground/30" : "bg-primary",
                    )}
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">{p.progress}%</span>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
