// Unpaid missions from the user's declaration papers, grouped with their organization.
// Shown on the dashboard once "Shape your talent" is complete.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowRight, Building2, Clock } from "lucide-react";

type Row = {
  id: string;
  client: string;
  type: string;
  budget: number;
  currency: string;
  entityName: string;
  orgName: string | null;
};

export function MyMissionsCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setRows([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: entities } = await supabase
        .from("declaration_entities")
        .select("id, name, organization_id, organizations(name)")
        .order("created_at", { ascending: false });

      const list = ((entities as any[]) ?? []);
      if (!list.length) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const byId = new Map(list.map((e) => [e.id, e]));

      const { data: missions } = await supabase
        .from("declaration_missions")
        .select("id, client, type, budget, currency, entity_id, created_at")
        .in("entity_id", list.map((e) => e.id))
        .eq("client_paid", false)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setRows(
        ((missions as any[]) ?? []).map((m) => {
          const e = byId.get(m.entity_id);
          return {
            id: m.id,
            client: m.client,
            type: m.type,
            budget: Number(m.budget ?? 0),
            currency: m.currency || "TND",
            entityName: e?.name ?? "",
            orgName: e?.organizations?.name ?? null,
          };
        }),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!loading && rows.length === 0) return null;

  const totals: Record<string, number> = {};
  rows.forEach((r) => { totals[r.currency] = (totals[r.currency] ?? 0) + r.budget; });

  return (
    <Card className="overflow-hidden border-border/70">
      <div className="h-1 w-full bg-gradient-to-r from-b4-coral via-b4-teal to-b4-navy" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-b4-coral/10 text-b4-coral">
                <Wallet className="w-4 h-4" />
              </span>
              Your missions
              {!loading && (
                <Badge variant="secondary" className="ml-1 font-medium">{rows.length}</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5">
              Missions still waiting to be paid.
            </p>
          </div>

          {!loading && rows.length > 0 && (
            <div className="flex items-center gap-4 text-right shrink-0">
              {Object.entries(totals).map(([cur, amount]) => (
                <div key={cur}>
                  <p className="text-lg font-semibold leading-none text-foreground tabular-nums">
                    {amount.toLocaleString()}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
                    {cur} pending
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : (
          rows.map((m) => (
            <Link
              key={m.id}
              to="/declaration"
              className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {m.client}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {m.orgName ?? m.entityName}
                    </span>
                    {m.type && <span className="truncate">{m.type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {m.budget.toLocaleString()} {m.currency}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                Not paid yet
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
