// Operational tab: external projects laid out by lifecycle step, plus a Closed column.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LIFECYCLE_STEPS, currentStep, isFinishedProject } from "@/lib/projectLifecycle";
import { ExternalProjectDetails, externalCardTitle } from "./ExternalProjectPreview";
import { KanbanSquare } from "lucide-react";

type P = any;
const COLUMNS = [
  ...LIFECYCLE_STEPS.map((s) => ({ key: String(s.n), label: s.label })),
  { key: "closed", label: "Closed" },
];

export function columnFor(p: { status?: string | null; progress?: number | null }): string {
  if (isFinishedProject(p)) return "closed";
  return String(currentStep(p.progress ?? 0) ?? "closed");
}

export function ExternalProjectsKanban({ orgId }: { orgId: string }) {
  const [projects, setProjects] = useState<P[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [dists, setDists] = useState<Record<string, { client: string | null; title: string }>>({});
  const [open, setOpen] = useState<P | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: pr }, { data: prods }] = await Promise.all([
        supabase.from("organization_projects" as any).select("*").eq("organization_id", orgId).eq("project_kind", "external").order("position"),
        supabase.from("organization_products").select("id, name").eq("organization_id", orgId),
      ]);
      if (!alive) return;
      const list = (pr as any[]) ?? [];
      setProjects(list);
      setProducts(Object.fromEntries(((prods as any[]) ?? []).map((x) => [x.id, x.name])));
      const ids = list.map((x) => x.distribution_record_id).filter(Boolean);
      if (ids.length) {
        const { data: d } = await supabase.from("distribution_records").select("id, client, title").in("id", ids);
        if (alive) setDists(Object.fromEntries(((d as any[]) ?? []).map((x) => [x.id, x])));
      }
    })();
    return () => { alive = false; };
  }, [orgId]);

  const grouped = useMemo(() => {
    const g: Record<string, P[]> = {};
    for (const c of COLUMNS) g[c.key] = [];
    for (const p of projects) g[columnFor(p)].push(p);
    return g;
  }, [projects]);

  const title = (p: P) => externalCardTitle(p, products[p.product_id] ?? dists[p.distribution_record_id]?.title, dists[p.distribution_record_id]?.client);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 md:col-span-2">
      <div className="flex items-center gap-2">
        <KanbanSquare className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Kanban</h3>
        <span className="text-xs text-muted-foreground">External projects by step</span>
        <Badge variant="outline" className="ml-auto">{projects.length}</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {COLUMNS.map((c, i) => (
          <div key={c.key} className="w-56 shrink-0 snap-start rounded-lg border border-border bg-muted/40 p-2">
            <div className="flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold text-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">{c.key === "closed" ? "✓" : i + 1}</span>
              <span className="truncate">{c.label}</span>
              <span className="ml-auto text-muted-foreground">{grouped[c.key].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[c.key].length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
              {grouped[c.key].map((p) => (
                <button key={p.id} type="button" onClick={() => setOpen(p)}
                  className="w-full rounded-md border border-border bg-card p-2.5 text-left text-sm font-medium text-foreground shadow-sm hover:border-primary/50 break-words">
                  {title(p)}
                  {p.budget != null && <span className="mt-1 block text-xs font-normal text-muted-foreground">{Number(p.budget).toLocaleString()} TND HT</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle className="break-words pr-6">{open && title(open)}</DialogTitle></DialogHeader>
          {open && <ExternalProjectDetails project={open} distClient={dists[open.distribution_record_id]?.client} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
