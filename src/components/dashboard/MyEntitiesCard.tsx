// Your entities — follow up projects per organization on the dashboard.
// Shown below "Your projects" once "Shape your talent" is complete.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ArrowRight, Rocket, ChevronDown } from "lucide-react";
import { OrgLogo } from "@/components/organization/OrgLogo";

type EntityRow = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  logoUrl: string | null;
  total: number;
  active: number;
  blocked: number;
  avgProgress: number;
  coreTrack: { name: string; progress: number; status: string } | null;
};

export function MyEntitiesCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setRows([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization:organizations(id, name, slug, logo_url)")
        .eq("user_id", user.id);

      const orgs = ((memberships as any[]) ?? [])
        .map((m) => m.organization)
        .filter(Boolean) as { id: string; name: string; slug: string; logo_url: string | null }[];

      if (!orgs.length) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }

      const { data: projects } = await supabase
        .from("organization_projects" as any)
        .select("*")
        .in("organization_id", orgs.map((o) => o.id));

      const byOrg = new Map<string, any[]>();
      ((projects as any[]) ?? []).forEach((p) => {
        const list = byOrg.get(p.organization_id) ?? [];
        list.push(p);
        byOrg.set(p.organization_id, list);
      });

      if (cancelled) return;
      const allRows = orgs.map((o) => {
        const list = byOrg.get(o.id) ?? [];
        const open = list.filter((p) => p.status !== "done" && (p.progress ?? 0) < 100);
        const avg = list.length
          ? Math.round(list.reduce((s, p) => s + (p.progress ?? 0), 0) / list.length)
          : 0;
        // Core project track = the project published for the entity itself
        const core =
          list.find(
            (p) => p.name.trim().toLowerCase() === o.name.trim().toLowerCase(),
          ) ?? null;
        return {
          orgId: o.id,
          orgName: o.name,
          orgSlug: o.slug,
          logoUrl: o.logo_url ?? null,
          total: list.length,
          active: open.filter((p) => p.status === "active").length,
          blocked: open.filter((p) => !!p.status_note).length,
          avgProgress: avg,
          coreTrack: core
            ? { name: core.name, progress: core.progress ?? 0, status: core.status }
            : null,
        };
      });
      // Same rule as "Your projects": only entities with at least one blocked project,
      // ranked by core project track progress, highest first.
      setRows(
        allRows
          .filter((r) => r.blocked > 0)
          .sort((a, b) => (b.coreTrack?.progress ?? 0) - (a.coreTrack?.progress ?? 0)),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const visibleRows = rows;

  if (!loading && rows.length === 0) return null;

  return (
    <Card className="overflow-hidden border-border/70">
      {/* Accent rail */}
      <div className="h-1 w-full bg-gradient-to-r from-b4-navy via-b4-teal to-b4-coral" />

      <CardHeader
        className={`pb-4 ${rows.length > 3 && !loading ? "cursor-pointer select-none hover:bg-muted/30 transition-colors" : ""}`}
        {...(rows.length > 3 && !loading
          ? {
              onClick: () => setExpanded((v) => !v),
              role: "button",
              "aria-expanded": expanded,
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded((v) => !v);
                }
              },
            }
          : {})}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <Building2 className="w-4 h-4" />
          </span>
          Your entities
          {!loading && (
            <Badge variant="secondary" className="ml-1 font-medium">{rows.length}</Badge>
          )}
          {!loading && rows.length > 3 && (
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1.5">
          Entities with at least one blocked project.
        </p>
      </CardHeader>

      {(rows.length <= 3 || expanded) && (
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : (
          visibleRows.map((e) => (
            <Link
              key={e.orgId}
              to={`/org/${e.orgSlug}?tab=projects`}
              className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-b4-teal/15 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden">
                    {e.logoUrl ? (
                      <OrgLogo path={e.logoUrl} alt={`${e.orgName} logo`} className="w-full h-full object-cover" iconClassName="w-5 h-5 text-primary" />
                    ) : (
                      e.orgName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {e.orgName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.total === 0
                        ? "No projects yet"
                        : `${e.total} project${e.total > 1 ? "s" : ""} · ${e.active} active${e.blocked > 0 ? ` · ${e.blocked} blocked` : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.blocked > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      {e.blocked} blocked
                    </Badge>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>

              {e.coreTrack ? (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground min-w-0 truncate">
                      <Rocket className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      Core project track
                    </span>
                    <span className="font-medium text-foreground tabular-nums shrink-0">
                      {e.coreTrack.progress}%
                    </span>
                  </div>
                  <Progress value={e.coreTrack.progress} className="h-1.5 mt-2" />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Rocket className="w-3.5 h-3.5" />
                  Core project track not published yet
                </div>
              )}
            </Link>
          ))
        )}
      </CardContent>
      )}
    </Card>
  );
}
