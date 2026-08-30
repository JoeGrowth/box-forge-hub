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

  const activeCount = rows.filter((r) => r.status === "active").length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const avgProgress = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + (r.progress ?? 0), 0) / rows.length)
    : 0;

  return (
    <Card className="overflow-hidden border-border/70">
      {/* Accent rail */}
      <div className="h-1 w-full bg-gradient-to-r from-b4-navy via-b4-teal to-b4-coral" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                <Rocket className="w-4 h-4" />
              </span>
              Your projects
              {!loading && (
                <Badge variant="secondary" className="ml-1 font-medium">{rows.length}</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5">
              Projects you can edit across your organizations.
            </p>
          </div>

          {!loading && rows.length > 0 && (
            <div className="flex items-center gap-4 text-right shrink-0">
              <div>
                <p className="text-lg font-semibold leading-none text-foreground">{activeCount}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">Active</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-lg font-semibold leading-none text-foreground">{doneCount}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">Done</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-lg font-semibold leading-none text-foreground">{avgProgress}%</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">Avg</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : (
          rows.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.planned;
            const initials = p.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("");
            return (
              <Link
                key={p.id}
                to={`/org/${p.orgSlug}?tab=projects`}
                className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-b4-teal/15 flex items-center justify-center text-xs font-semibold text-primary">
                    {initials || "P"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.orgName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </div>

                    {(p.lead || p.target_date) && (
                      <div className="flex items-center gap-3 flex-wrap mt-2 text-xs text-muted-foreground">
                        {p.lead && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {p.lead}
                          </span>
                        )}
                        {p.target_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {p.target_date}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={p.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-foreground w-10 text-right tabular-nums">
                        {p.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
