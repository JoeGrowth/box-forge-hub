// Project — manage internal projects (build the entity / ready to be sold as product) and external projects (deliveries).
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LIFECYCLE_STEPS, progressForCompleted, completedFromProgress, currentStep } from "@/lib/projectLifecycle";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createDistEntity } from "@/pages/Distribution";
import { withBaseCharges, normalizeTaskLocks } from "@/components/organization/DistributionModels";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Rocket, CalendarDays, User, Loader2, AlertTriangle, Archive, ChevronDown, ChevronUp, RotateCcw, Building2, Send, Calculator, Eye } from "lucide-react";

type TalentCandidate = { user_id: string; full_name: string | null; avatar_url: string | null };

type OrgProject = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: string;
  lead: string | null;
  start_date: string | null;
  target_date: string | null;
  progress: number;
  status_note: string | null;
  project_kind: string;
  product_id?: string | null;
  product_iteration_id?: string | null;
  budget?: number | null;
  point_of_contact?: string | null;
  sold_at?: string | null;
  delivered_at?: string | null;
  paid_at?: string | null;
  distribution_record_id?: string | null;
};

const KINDS = [
  { value: "internal", label: "Internal", hint: "Helps build the entity or gets it ready to be sold as a product", icon: Building2 },
  { value: "external", label: "External", hint: "Delivered to a client", icon: Send },
];
const kindMeta = (k: string) => KINDS.find((x) => x.value === k) ?? KINDS[0];

const STATUSES = [
  { value: "planned", label: "Planned", className: "bg-muted text-muted-foreground" },
  { value: "active", label: "Active", className: "bg-primary/10 text-primary border-primary/30" },
  { value: "on_hold", label: "On hold", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "done", label: "Done", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
];
const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

const emptyDraft = {
  name: "", description: "", status: "planned", lead: "",
  start_date: "", target_date: "", progress: 0, status_note: "",
  project_kind: "internal",
  product_name: "",
  budget: "",
  point_of_contact: "", sold_at: "", delivered_at: "", paid_at: "",
};

const SectionTitle = ({ n, title }: { n: number; title: string }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{n}</span>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
  </div>
);

export function OrgProjectsTab({ orgId, orgName, canEdit, userId }: { orgId: string; orgName?: string; canEdit: boolean; userId?: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [distBusy, setDistBusy] = useState(false);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgProject | null>(null);
  const [previewing, setPreviewing] = useState<OrgProject | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [step, setStep] = useState(1);
  const [leadResults, setLeadResults] = useState<TalentCandidate[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [leadFocused, setLeadFocused] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [legacyLinked, setLegacyLinked] = useState(true);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const searchTalents = async (q: string) => {
    setDraft((d) => ({ ...d, lead: q }));
    if (q.trim().length < 2) { setLeadResults([]); return; }
    setLeadSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .ilike("full_name", `%${q.trim()}%`)
      .limit(8);
    setLeadResults((data ?? []) as TalentCandidate[]);
    setLeadSearching(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: idea }, { data: prods }] = await Promise.all([
      supabase
        .from("organization_projects" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("startup_ideas").select("id").eq("organization_id", orgId).maybeSingle(),
      supabase.from("organization_products").select("id, name").eq("organization_id", orgId).is("archived_at", null).order("position"),
    ]);
    setProducts((prods as any[]) ?? []);
    setProjects(((data as any[]) ?? []) as OrgProject[]);
    setLegacyLinked(!!idea?.id);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setDraft({ ...emptyDraft }); setStep(1); setOpen(true); };
  const openEdit = (p: OrgProject) => {
    setEditing(p);
    setDraft({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      lead: p.lead ?? "",
      start_date: p.start_date ?? "",
      target_date: p.target_date ?? "",
      progress: p.progress ?? 0,
      status_note: p.status_note ?? "",
      project_kind: p.project_kind ?? "internal",
      product_name: "",
      budget: p.budget != null ? String(p.budget) : "",
      point_of_contact: p.point_of_contact ?? "", sold_at: p.sold_at ?? "", delivered_at: p.delivered_at ?? "", paid_at: p.paid_at ?? "",
    });
    setStep(1);
    if (p.product_id) {
      supabase.from("organization_products").select("name").eq("id", p.product_id).maybeSingle()
        .then(({ data }) => data && setDraft((d) => ({ ...d, product_name: (data as any).name })));
    }
    setOpen(true);
  };

  const save = async (goDistribution = false) => {
    if (!draft.name.trim()) return;
    const isExternal = draft.project_kind === "external";
    const productName = draft.product_name.trim();
    if (isExternal && !productName) {
      return toast({ title: "Product required", description: "External projects must be linked to a product.", variant: "destructive" });
    }
    let productId: string | null = null;
    if (isExternal) {
      const existing = products.find((x) => x.name.trim().toLowerCase() === productName.toLowerCase());
      if (existing) productId = existing.id;
      else {
        const { data: np, error: pe } = await supabase.from("organization_products")
          .insert({ organization_id: orgId, name: productName, created_by: userId!, position: products.length + 1 } as any)
          .select("id").single();
        if (pe) return toast({ title: "Product creation failed", description: pe.message, variant: "destructive" });
        productId = (np as any).id;
      }
    }
    const progressValue = progressForCompleted(completedFromProgress(Number(draft.progress) || 0));
    const payload: any = {
      organization_id: orgId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      status: progressValue >= 100 ? "done" : draft.status === "done" ? "active" : draft.status,
      lead: draft.lead.trim() || null,
      start_date: draft.start_date || null,
      target_date: draft.target_date || null,
      progress: progressValue,
      status_note: draft.status_note.trim() || null,
      project_kind: isExternal ? "external" : "internal",
      product_id: productId,
      budget: draft.budget.trim() === "" ? null : Number(draft.budget) || 0,
      point_of_contact: isExternal ? (draft.point_of_contact.trim() || null) : null,
      sold_at: draft.sold_at || null, delivered_at: draft.delivered_at || null, paid_at: draft.paid_at || null,
    };
    const { data: saved, error } = editing
      ? await supabase.from("organization_projects" as any).update(payload).eq("id", editing.id).select("*").single()
      : await supabase.from("organization_projects" as any).insert({ ...payload, created_by: userId ?? null }).select("*").single();
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    const sp = saved as any as OrgProject;
    // Sync shipped iteration in Products
    if (productId) {
      let itId = sp.product_iteration_id ?? null;
      if (itId) {
        const { data: it } = await supabase.from("organization_product_iterations").select("id").eq("id", itId).maybeSingle();
        if (!it) itId = null;
      }
      if (itId) {
        await supabase.from("organization_product_iterations").update({ product_id: productId, title: payload.name } as any).eq("id", itId);
      } else if (userId) {
        const { count } = await supabase.from("organization_product_iterations")
          .select("id", { count: "exact", head: true }).eq("product_id", productId);
        const { data: newIt } = await supabase.from("organization_product_iterations").insert({
          organization_id: orgId, product_id: productId, title: payload.name,
          description: payload.description, version_number: (count ?? 0) + 1,
          implementation_type: "client_project",
          shipped_at: payload.target_date || new Date().toISOString().slice(0, 10),
          created_by: userId,
        } as any).select("id").single();
        if (newIt) await supabase.from("organization_projects" as any).update({ product_iteration_id: (newIt as any).id }).eq("id", sp.id);
      }
    }
    toast({ title: editing ? "Project updated" : "Project added" });
    setOpen(false);
    load();
    if (goDistribution) await openDistribution({ ...sp, budget: payload.budget, product_id: productId }, productName);
  };

  // Open (or create once) the mission distribution page for this project,
  // using the distribution model named after the linked product.
  const openDistribution = async (p: OrgProject, productNameHint?: string) => {
    if (!userId) return;
    setDistBusy(true);
    try {
      const recTable = () => supabase.from("distribution_records" as never) as never as any;
      if (p.distribution_record_id) {
        const { data: rec } = await recTable().select("id").eq("id", p.distribution_record_id).maybeSingle();
        if (rec?.id) {
          await recTable().update({ budget: Number(p.budget) || 0, title: p.name }).eq("id", rec.id);
          navigate(`/mission/${rec.id}`);
          return;
        }
      }
      let productName = productNameHint?.trim() || "";
      if (!productName && p.product_id) {
        const { data } = await supabase.from("organization_products").select("name").eq("id", p.product_id).maybeSingle();
        productName = (data as any)?.name ?? "";
      }
      if (!productName) {
        toast({ title: "Product required", description: "Link this project to a delivered product to use its distribution model.", variant: "destructive" });
        return;
      }
      const { data: models } = await (supabase.from("distribution_models" as never) as never as any)
        .select("id,name,tasks,charges").eq("org_id", orgId).order("created_at", { ascending: true });
      const norm = (v: string) => v.trim().toLowerCase();
      const model = ((models as any[]) ?? []).find((m) => norm(m.name) === norm(productName));
      if (!model) {
        toast({ title: "No distribution model", description: `Create a distribution model named "${productName}" first.`, variant: "destructive" });
        return;
      }
      const { data: ents } = await (supabase.from("distribution_entities" as never) as never as any)
        .select("id").eq("org_id", orgId).order("created_at", { ascending: true }).limit(1);
      let entityId: string | undefined = (ents as any[])?.[0]?.id;
      if (!entityId) entityId = (await createDistEntity(`${orgName ?? "Organization"} distribution`, userId, orgId)).id;
      const { count } = await supabase.from("organization_product_iterations")
        .select("id", { count: "exact", head: true }).eq("product_id", p.product_id!).is("archived_at", null);
      const budgetNum = Number(p.budget) || 0;
      const uid = () => Math.random().toString(36).slice(2, 9);
      const charges = withBaseCharges(model.charges ?? []).map((c: any) => ({
        ...c,
        id: uid(),
        amount: c.fixed && c.percent != null ? Math.round(((Number(c.percent) || 0) / 100) * budgetNum * 100) / 100 : Number(c.amount) || 0,
      }));
      const { data: rec, error } = await recTable().insert({
        user_id: userId,
        kind: `${entityId}:model-${model.id}`,
        client: null,
        title: p.name,
        iteration: count ?? 1,
        budget_label: model.name,
        budget: budgetNum,
        currency: "TND",
        charges,
        tasks: normalizeTaskLocks(model.tasks ?? []).map((t: any) => ({ ...t, id: uid() })),
        people: ["Person (1)", "Person (2)"],
      }).select("id").maybeSingle();
      if (error || !rec?.id) {
        toast({ title: "Could not create the mission page", description: error?.message, variant: "destructive" });
        return;
      }
      await supabase.from("organization_projects" as any).update({ distribution_record_id: rec.id }).eq("id", p.id);
      navigate(`/mission/${rec.id}`);
    } finally {
      setDistBusy(false);
    }
  };

  const updateProgress = async (p: OrgProject, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    if (v === p.progress) return;
    const nextStatus = v >= 100 ? "done" : p.status === "done" ? "active" : p.status;
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, progress: v, status: nextStatus } : x)));
    const { error } = await supabase
      .from("organization_projects" as any)
      .update({ progress: v, status: nextStatus })
      .eq("id", p.id);
    if (!error && v >= 100 && p.status !== "done") {
      toast({ title: "Project closed", description: `"${p.name}" reached 100% and moved to the archive.` });
    }
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const handleBarInteract = (e: MouseEvent<HTMLDivElement>, p: OrgProject) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    updateProgress(p, Math.round(pct / 5) * 5);
  };

  const [adding, setAdding] = useState(false);
  const addOrgAsProject = async () => {
    if (!orgName) return;
    setAdding(true);
    if (!hasOrgProject) {
      const { error } = await supabase.from("organization_projects" as any).insert({
        organization_id: orgId,
        name: orgName,
        description: `Core project track for ${orgName}.`,
        status: "active",
        progress: 0,
        project_kind: "internal",
        created_by: userId ?? null,
      });
      if (error) {
        setAdding(false);
        return toast({ title: "Could not add", description: error.message, variant: "destructive" });
      }
    }
    const { error: linkError } = await supabase.rpc("link_organization_to_legacy" as any, { _org_id: orgId });
    setAdding(false);
    if (linkError) {
      return toast({ title: "Could not publish", description: linkError.message, variant: "destructive" });
    }
    toast({ title: `${orgName} is now tracked`, description: "It appears in Projects and in Your Legacy." });
    load();
  };

  const remove = async (p: OrgProject) => {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    const { error } = await supabase.from("organization_projects" as any).delete().eq("id", p.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const isClosed = (p: OrgProject) => p.status === "done" || (p.progress ?? 0) >= 100;
  const openProjects = projects.filter((p) => !isClosed(p));
  const archivedProjects = projects.filter(isClosed);
  const counts = STATUSES.map((s) => ({ ...s, count: projects.filter((p) => p.status === s.value).length }));
  const hasOrgProject = !!orgName && projects.some((p) => p.name.trim().toLowerCase() === orgName.trim().toLowerCase());

  const renderCard = (p: OrgProject) => {
    const meta = statusMeta(p.status);
    return (
      <div key={p.id} className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground truncate">{p.name}</h4>
              <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
            </div>
            {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
            <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
              {p.lead && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.lead}</span>}
              {(p.start_date || p.target_date) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {p.start_date || "—"} → {p.target_date || "—"}
                </span>
              )}
             </div>
           </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit project">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Delete project">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setPreviewing(p)} title="Preview project">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3">
          {(() => {
            const done = completedFromProgress(p.progress);
            const cur = currentStep(p.progress);
            const curMeta = cur ? LIFECYCLE_STEPS[cur - 1] : null;
            return (
              <>
                <div className="flex justify-between gap-2 text-xs text-muted-foreground mb-1.5">
                  <span className="truncate">{curMeta ? <>Step {cur}/6 · <span className="font-medium text-foreground">{curMeta.label}</span></> : "All steps done"}</span>
                  <span className="font-semibold text-foreground">{progressForCompleted(done)}%</span>
                </div>
                <div className="flex gap-1">
                  {LIFECYCLE_STEPS.map((st) => {
                    const isDone = done >= st.n;
                    const isCur = cur === st.n;
                    return (
                      <button
                        type="button"
                        key={st.n}
                        disabled={!canEdit}
                        onClick={() => updateProgress(p, progressForCompleted(isDone && done === st.n ? st.n - 1 : st.n))}
                        title={`${st.n}. ${st.label} (${st.weight}%)${canEdit ? " — click to mark done" : ""}`}
                        style={{ flexGrow: st.weight, flexBasis: 0 }}
                        className={`h-2 rounded-full transition-all ${isDone ? "bg-primary" : isCur ? (p.status_note ? "bg-amber-500/60" : "bg-primary/30") : "bg-muted"} ${canEdit ? "hover:h-3 cursor-pointer" : "cursor-default"}`}
                      />
                    );
                  })}
                </div>
                {p.status_note && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="min-w-0">{curMeta && <span className="font-semibold">Blocked at {cur}. {curMeta.label}: </span>}{p.status_note}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Project</h3>
          <p className="text-sm text-muted-foreground">Internal projects build the entity or get it ready to be sold as a product. External projects are client deliveries.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStep(n)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${step === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    {n}. {n === 1 ? "Project" : n === 2 ? (draft.project_kind === "external" ? "Delivery" : "Planning") : "Set up"}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {step === 1 && (
                <section className="space-y-3 rounded-xl border border-border p-3">
                <SectionTitle n={1} title="Project" />
                <div>
                  <Label>Project name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. CHU pilot deployment" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Scope, objective, expected outcome" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={draft.project_kind} onValueChange={(v) => setDraft({ ...draft, project_kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{kindMeta(draft.project_kind).hint}</p>
                </div>
                </section>
                )}
                {step === 2 && (
                <section className="space-y-3 rounded-xl border border-border p-3">
                <SectionTitle n={2} title={draft.project_kind === "external" ? "Delivery details" : "Planning"} />
                {draft.project_kind === "external" && (
                  <div>
                    <Label>Product delivered *</Label>
                    <Input list={`org-products-${orgId}`} value={draft.product_name}
                      onChange={(e) => setDraft({ ...draft, product_name: e.target.value })}
                      placeholder="Pick from your products or type a new one" />
                    <datalist id={`org-products-${orgId}`}>
                      {products.map((p) => <option key={p.id} value={p.name} />)}
                    </datalist>
                    <p className="text-xs text-muted-foreground mt-1">This project is counted as a shipped delivery of the product.</p>
                  </div>
                )}
                <div>
                  <Label>Budget (TND)</Label>
                  <Input type="number" min={0} value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} placeholder="e.g. 2000" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {draft.project_kind === "external" ? (
                    <div>
                      <Label>Point of contact</Label>
                      <Input value={draft.point_of_contact} onChange={(e) => setDraft({ ...draft, point_of_contact: e.target.value })} placeholder="Client-side contact (name, role, phone)" />
                    </div>
                  ) : (
                    <div>
                      <Label>Status</Label>
                      <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Lead</Label>
                    <div className="relative">
                      <Input
                        value={draft.lead}
                        onChange={(e) => searchTalents(e.target.value)}
                        onFocus={() => setLeadFocused(true)}
                        onBlur={() => setTimeout(() => setLeadFocused(false), 150)}
                        placeholder="Owner name (e.g. Imen Harrazi)"
                      />
                      {leadSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                      {leadFocused && leadResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md divide-y max-h-56 overflow-auto">
                          {leadResults.map((c) => (
                            <button
                              key={c.user_id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setDraft((d) => ({ ...d, lead: c.full_name ?? "" })); setLeadResults([]); }}
                              className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/60"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.avatar_url ?? undefined} />
                                <AvatarFallback>{(c.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">{c.full_name ?? "Unnamed"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Target date</Label>
                    <Input type="date" value={draft.target_date} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} />
                  </div>
                </div>
                </section>
                )}
                {step === 3 && (
                <section className="space-y-3 rounded-xl border border-border p-3">
                <SectionTitle n={3} title="Project Set up" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Sold on</Label><Input type="date" value={draft.sold_at} onChange={(e) => setDraft({ ...draft, sold_at: e.target.value })} /></div>
                  <div><Label>Delivered on</Label><Input type="date" value={draft.delivered_at} onChange={(e) => setDraft({ ...draft, delivered_at: e.target.value })} /></div>
                  <div><Label>Paid on</Label><Input type="date" value={draft.paid_at} onChange={(e) => setDraft({ ...draft, paid_at: e.target.value })} /></div>
                  <div className="col-span-full">
                    <Label>Project step</Label>
                    <p className="text-xs text-muted-foreground mb-2">Tick the last step that is fully done. Progress follows the step weights.</p>
                    <div className="space-y-1.5">
                      {LIFECYCLE_STEPS.map((st) => {
                        const done = completedFromProgress(draft.progress) >= st.n;
                        const isCurrent = currentStep(draft.progress) === st.n;
                        return (
                          <button
                            type="button"
                            key={st.n}
                            onClick={() => setDraft({ ...draft, progress: progressForCompleted(done && completedFromProgress(draft.progress) === st.n ? st.n - 1 : st.n) })}
                            className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${done ? "border-primary/40 bg-primary/5" : isCurrent ? "border-amber-500/40 bg-amber-500/5" : "border-border hover:bg-muted"}`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-primary text-primary-foreground" : isCurrent ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>{st.n}</span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                                {st.label}<span className="text-xs font-normal text-muted-foreground">{st.weight}%</span>
                              </span>
                              <span className="block text-xs text-muted-foreground">{st.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Progress: <span className="font-semibold text-foreground">{progressForCompleted(completedFromProgress(draft.progress))}%</span>{currentStep(draft.progress) ? ` · now in step ${currentStep(draft.progress)}` : " · all steps done"}</p>
                  </div>
                   <div className="col-span-full">
                     <Label>Blocker / where it stands</Label>
                     <Textarea
                       rows={4}
                       value={draft.status_note}
                       onChange={(e) => setDraft({ ...draft, status_note: e.target.value })}
                       placeholder="e.g. Waiting for Mehdi to give access"
                     />
                   </div>
                 </div>
                </section>
               </div>
               <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="secondary" onClick={() => save(true)} disabled={distBusy || draft.project_kind !== "external"} title={draft.project_kind !== "external" ? "Budget distribution uses the delivered product's model (External projects)" : "Save and open the mission distribution page"}>
                  {distBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calculator className="w-4 h-4 mr-1" />}Budget Distribution
                </Button>
                <Button onClick={() => save()}>{editing ? "Save changes" : "Add project"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="break-words pr-6">{previewing?.name}</DialogTitle></DialogHeader>
            {previewing && (() => {
              const done = completedFromProgress(previewing.progress ?? 0);
              const rows = [
                { label: "Sold", ok: done >= 2 || !!previewing.sold_at, when: previewing.sold_at },
                { label: "Delivered", ok: done >= 5 || !!previewing.delivered_at, when: previewing.delivered_at },
                { label: "Paid", ok: done >= 6 || !!previewing.paid_at, when: previewing.paid_at },
              ];
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{kindMeta(previewing.project_kind).label}</Badge>
                    {previewing.budget != null && <span>Budget {Number(previewing.budget).toLocaleString()} TND</span>}
                    {previewing.lead && <span>Lead {previewing.lead}</span>}
                    {previewing.point_of_contact && <span>Contact {previewing.point_of_contact}</span>}
                  </div>
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
            })()}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {counts.map((c) => (
          <div key={c.value} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-xl font-semibold text-foreground">{c.count}</p>
          </div>
        ))}
      </div>

      {!loading && canEdit && orgName && (!hasOrgProject || !legacyLinked) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{orgName} is not published as a venture yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Publish it to track it here and make it visible in Projects and in Your Legacy.
            </p>
          </div>
          <Button onClick={addOrgAsProject} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Publish {orgName} to Projects & Legacy
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Rocket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canEdit ? "Add the first project this organization is running." : "An editor needs to add one."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {KINDS.map((kind) => {
            const items = openProjects.filter((p) => (p.project_kind ?? "internal") === kind.value);
            const KindIcon = kind.icon;
            return (
              <div key={kind.value} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <KindIcon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">{kind.label} projects</h4>
                  <span className="text-xs text-muted-foreground">· {kind.hint}</span>
                  <Badge variant="outline" className="ml-auto">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No {kind.label.toLowerCase()} projects yet.</p>
                ) : (
                  items.map(renderCard)
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && archivedProjects.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Archive className="w-4 h-4 text-muted-foreground" />
              Archive · finished projects
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {archivedProjects.length}
              </Badge>
            </span>
            {showArchive ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showArchive && (
            <div className="px-4 pb-4 space-y-2">
              {archivedProjects.map((p) => {
                const km = kindMeta(p.project_kind);
                return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name}
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">{km.label}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Closed at {p.progress}%{p.target_date ? ` · ${p.target_date}` : ""}{p.lead ? ` · ${p.lead}` : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => updateProgress(p, 90)} title="Reopen project">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Delete project">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
