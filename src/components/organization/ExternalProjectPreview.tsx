// Shared preview body for external projects (Projects tab preview + Operational kanban).
import { Badge } from "@/components/ui/badge";
import { completedFromProgress } from "@/lib/projectLifecycle";

export type ExternalPreviewProject = {
  name: string;
  budget?: number | null;
  point_of_contact?: string | null;
  client?: string | null;
  context?: string | null;
  contract_signed?: boolean | null;
  advance_paid_percent?: number | null;
  progress?: number | null;
  sold_at?: string | null;
  delivered_at?: string | null;
  paid_at?: string | null;
};

export function paymentSituation(p: ExternalPreviewProject): string {
  const done = completedFromProgress(p.progress ?? 0);
  if (p.paid_at || done >= 6) return "100% paid";
  const adv = Math.max(0, Math.min(100, Number(p.advance_paid_percent) || 0));
  if (adv <= 0) return "Not paid yet";
  return `${adv}% advance paid | ${100 - adv}% not yet`;
}

export function externalCardTitle(p: ExternalPreviewProject, service?: string | null, distClient?: string | null): string {
  const client = (p.client || distClient || "").trim();
  const svc = (service || "").trim();
  return [client, svc].filter(Boolean).join(" | ") || p.name;
}

export function ExternalProjectDetails({ project, distClient }: { project: ExternalPreviewProject; distClient?: string | null }) {
  const done = completedFromProgress(project.progress ?? 0);
  const info = [
    { label: "Client", value: project.client || distClient || "—" },
    { label: "Budget", value: project.budget != null ? `${Number(project.budget).toLocaleString()} TND HT` : "—" },
    { label: "Context", value: project.context || project.name },
    { label: "Contact", value: project.point_of_contact || "—" },
    { label: "Contract", value: project.contract_signed ? "Contract signed" : "No contract signed" },
    { label: "Payment situation", value: paymentSituation(project) },
  ];
  const rows = [
    { label: "Sold", ok: done >= 2 || !!project.sold_at, when: project.sold_at },
    { label: "Delivered", ok: done >= 5 || !!project.delivered_at, when: project.delivered_at },
    { label: "Paid", ok: done >= 6 || !!project.paid_at, when: project.paid_at },
  ];
  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border rounded-xl border border-border">
        {info.map((i) => (
          <div key={i.label} className="grid grid-cols-[minmax(0,120px)_1fr] gap-2 px-3 py-2 text-sm">
            <dt className="text-muted-foreground">{i.label}</dt>
            <dd className="font-medium text-foreground break-words">{i.value}</dd>
          </div>
        ))}
      </dl>
      <div className="divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-3 items-center gap-2 px-3 py-2.5 text-sm">
            <span className="font-medium text-foreground">{r.label}</span>
            <Badge variant="outline" className={r.ok ? "border-primary/40 text-primary w-fit" : "text-muted-foreground w-fit"}>{r.ok ? "Yes" : "Not yet"}</Badge>
            <span className="text-right text-muted-foreground">{r.when || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
