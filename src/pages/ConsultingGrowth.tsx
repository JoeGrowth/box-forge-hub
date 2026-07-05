import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Briefcase, CheckCircle2, TrendingUp, DollarSign,
  FileText, Upload, ArrowRight, Users, Trash2, ExternalLink, Loader2, RefreshCw, Lock,
} from "lucide-react";
import { format } from "date-fns";
import { Footer } from "@/components/layout/Footer";
import { NextGoalBanner } from "@/components/progression/NextGoalBanner";

type DistCharge = { id: string; label: string; amount: number };
type DistTask = { id: string; label: string; percent: number; locked?: boolean };
const distUid = () => Math.random().toString(36).slice(2, 9);
const distFmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );
const DEFAULT_DIST_CHARGES = (): DistCharge[] => [
  { id: distUid(), label: "Tools & software", amount: 0 },
  { id: distUid(), label: "Travel", amount: 0 },
];
const DEFAULT_DIST_TASKS = (): DistTask[] => [
  { id: distUid(), label: "Scoping & proposal", percent: 15 },
  { id: distUid(), label: "Client discovery", percent: 15 },
  { id: distUid(), label: "Delivery / execution", percent: 40 },
  { id: distUid(), label: "Reporting & handover", percent: 15 },
  { id: distUid(), label: "Follow-up & admin", percent: 10 },
  { id: distUid(), label: "Rest Structure Consulting", percent: 5, locked: true },
];

type Stage = "identify" | "propose" | "confirm_prepare" | "deliver" | "payment_distribution" | "closed";

interface Opportunity {
  id: string;
  title: string;
  client_name: string | null;
  source: string;
  description: string | null;
  number_of_days: number | null;
  amount_per_day: number | null;
  total_amount: number | null;
  currency: string | null;
  is_completed: boolean;
  completed_at: string | null;
  offer_date: string | null;
  stage: Stage;
  driver_file_url: string | null;
  driver_note: string | null;
  proposal_file_url: string | null;
  proposal_sent_at: string | null;
  client_confirmed_at: string | null;
  process_file_url: string | null;
  delivered_at: string | null;
  paid_amount: number | null;
  paid_at: string | null;
}

interface Distribution {
  id: string;
  opportunity_id: string;
  recipient_name: string;
  percent: number | null;
  amount: number | null;
  note: string | null;
  declared_at: string | null;
}

const SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "word_of_mouth", label: "Word of mouth / Referral" },
  { value: "other", label: "Tender / Direct / Partner / Other" },
];

const STAGES: { value: Stage; label: string; short: string; icon: typeof Briefcase }[] = [
  { value: "identify",             label: "1. Catched opportunity",    short: "Catched",     icon: Briefcase },
  { value: "propose",              label: "2. Send proposal",           short: "Propose",      icon: FileText },
  { value: "confirm_prepare",      label: "3. Confirm & prepare",       short: "Prepare",      icon: CheckCircle2 },
  { value: "deliver",              label: "4. Deliver",                 short: "Deliver",      icon: ArrowRight },
  { value: "payment_distribution", label: "5. receive and distribute",  short: "receive and distribute", icon: DollarSign },
  { value: "closed",               label: "6. Accounting",              short: "Accounting",     icon: Users },
];

const MILESTONE = 10;
const BUCKET = "consulting-opportunities";
const DRAFT_KEY = "consulting-growth:new-opp-draft";
const OPEN_KEY = "consulting-growth:new-opp-open";

const EMPTY_FORM = {
  title: "",
  client_name: "",
  source: "linkedin",
  description: "",
  number_of_days: "",
  amount_per_day: "",
  currency: "EUR",
};

function stageIndex(s: Stage) { return STAGES.findIndex(x => x.value === s); }
function nextStage(s: Stage): Stage { return STAGES[Math.min(STAGES.length - 1, stageIndex(s) + 1)].value; }

export default function ConsultingGrowth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [distByOpp, setDistByOpp] = useState<Record<string, Distribution[]>>({});
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");

  const [dialogOpen, setDialogOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? { ...EMPTY_FORM, ...JSON.parse(raw) } : EMPTY_FORM;
      const valid = SOURCES.some(s => s.value === parsed.source);
      return valid ? parsed : { ...parsed, source: EMPTY_FORM.source };
    } catch { return EMPTY_FORM; }
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {} }, [form]);
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, dialogOpen ? "1" : "0"); } catch {} }, [dialogOpen]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("consultant_opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setItems((data ?? []) as Opportunity[]);

    const { data: dists } = await supabase
      .from("consultant_opportunity_distributions")
      .select("id,opportunity_id,recipient_name,percent,amount,note,declared_at")
      .eq("user_id", user.id);
    const grouped: Record<string, Distribution[]> = {};
    (dists ?? []).forEach(d => {
      (grouped[d.opportunity_id] ||= []).push(d as Distribution);
    });
    setDistByOpp(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const days = form.number_of_days ? parseInt(form.number_of_days) : null;
    const perDay = form.amount_per_day ? parseFloat(form.amount_per_day) : null;
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      client_name: form.client_name.trim() || null,
      consulting_firm: form.client_name.trim() || null,
      source: form.source,
      description: form.description.trim() || null,
      number_of_days: days,
      amount_per_day: perDay,
      currency: form.currency || "EUR",
      offer_date: new Date().toISOString().slice(0, 10),
      stage: "identify" as Stage,
    } as never;
    const { data: inserted, error } = await supabase.from("consultant_opportunities").insert(payload).select("id").single();
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity added", description: "Now upload the driver (PDF / screenshot) in the pipeline." });
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(OPEN_KEY); } catch {}
    setStageFilter("identify");
    if (inserted?.id) setExpandedId(inserted.id);
    load();
  };

  // ---------- Financial totals ----------
  const closed = items.filter(i => i.stage === "closed");
  const pipeline = items.filter(i => i.stage !== "closed");
  const totalRevenue = items.reduce((sum, i) => sum + Number(i.paid_amount ?? 0), 0);
  const activeClients = new Set(items.filter(i => i.paid_at).map(i => i.client_name).filter(Boolean)).size;
  const milestonePct = Math.min(100, (closed.length / MILESTONE) * 100);

  return (
    <>
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h1 className="text-3xl font-bold tracking-tight">Consulting Growth</h1>
          <p className="text-muted-foreground mt-1">
            5-stage pipeline: Catched &rarr; Propose &rarr; Prepare &rarr; Deliver &rarr; receive and distribute.
          </p>
        </div>
      </div>

      <NextGoalBanner pageStage="advisor" />

      {/* Opportunities */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Opportunities</h2>
            <p className="text-sm text-muted-foreground">Advance it through the stages.</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> add opportunity
          </Button>
        </div>

        {/* Stage tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(() => {
            const tabs: { key: Stage | "all"; label: string; icon: typeof Briefcase; count: number }[] = [
              { key: "all", label: "Prospects", icon: Briefcase, count: items.length },
              ...STAGES.map(s => ({
                key: s.value,
                label: s.short,
                icon: s.icon,
                count: items.filter(i => i.stage === s.value).length,
              })),
            ];
            return tabs.map(t => {
              const active = stageFilter === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setStageFilter(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                    active
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label} <span className="text-xs opacity-70">({t.count})</span>
                </button>
              );
            });
          })()}
        </div>

        {(() => {
          const filtered = stageFilter === "all" ? items : items.filter(i => i.stage === stageFilter);
          if (loading) return <div className="text-sm text-muted-foreground">Loading&hellip;</div>;
          if (filtered.length === 0) {
            return (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">
                  {stageFilter === "all" ? "Nothing in the pipeline yet" : "No missions in this stage"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stageFilter === "all"
                    ? "Add your first opportunity to start the flow."
                    : "Move a mission to this stage from another tab."}
                </p>
              </div>
            );
          }
          return (
            <div className="space-y-3">
              {filtered.map(o => {
                const idx = stageIndex(o.stage);
                const isOpen = expandedId === o.id;
                return (
                  <div
                    key={o.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        if (stageFilter === "all") return;
                        setExpandedId(isOpen ? null : o.id);
                      }}
                      className="w-full text-left p-5 hover:bg-muted/30 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{o.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground truncate">{o.client_name || "&mdash;"}</p>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{o.source}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {o.total_amount && (
                            <span className="text-xs text-muted-foreground">
                              {Number(o.total_amount).toLocaleString()} {o.currency}
                            </span>
                          )}
                          <Badge variant="secondary">{STAGES[idx]?.short}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-1">
                        {STAGES.slice(0, 6).map((s, i) => (
                          <div
                            key={s.value}
                            className={`h-1.5 flex-1 rounded ${i <= idx ? "bg-primary" : "bg-muted"}`}
                            title={s.short}
                          />
                        ))}
                      </div>
                    </button>
                    {isOpen && stageFilter !== "all" && (
                      <div className="border-t border-border bg-muted/10 p-5">
                        <StagePanel
                          opp={o}
                          distributions={distByOpp[o.id] || []}
                          onChanged={async () => { await load(); }}
                          onOptimisticPatch={(fields) => setItems(prev => prev.map(it => it.id === o.id ? { ...it, ...fields } : it))}
                          onStageChange={(to) => { setStageFilter(to === "closed" ? "closed" : to); setExpandedId(o.id); }}
                          userId={user?.id ?? ""}
                          onlyStage={stageFilter}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>


    </div>

    {/* New opportunity dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>add opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="opp-title">Title</Label>
            <Input id="opp-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Mission title" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="opp-client">Client / Organization</Label>
            <Input id="opp-client" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client name" />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="opp-desc">Description</Label>
            <Textarea id="opp-desc" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Context, scope, notes..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="opp-days">Number of days</Label>
              <Input id="opp-days" type="number" value={form.number_of_days} onChange={e => setForm({ ...form, number_of_days: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="opp-rate">Amount per day</Label>
              <Input id="opp-rate" type="number" value={form.amount_per_day} onChange={e => setForm({ ...form, amount_per_day: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="opp-currency">Currency</Label>
            <Input id="opp-currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Footer />
    </>
  );
}

// =============================================================================
// Inline stage panel (rendered inside expanded pipeline cards)
// =============================================================================

function StagePanel({
  opp, distributions, onChanged, onOptimisticPatch, onStageChange, userId, onlyStage,
}: {
  opp: Opportunity;
  distributions: Distribution[];
  onChanged: () => Promise<void>;
  onOptimisticPatch?: (fields: Partial<Opportunity>) => void;
  onStageChange?: (to: Stage) => void;
  userId: string;
  onlyStage: Stage | null;
}) {
  const show = (s: Stage) => onlyStage === null || onlyStage === s || (onlyStage === "closed" && s === "payment_distribution");
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const [driverNote, setDriverNote] = useState(opp.driver_note ?? "");
  const [paidAmount, setPaidAmount] = useState(String(opp.paid_amount ?? opp.total_amount ?? ""));
  // Distribution builder state (Mission Setup / Charges / People / Tasks)
  const [budgetLabel, setBudgetLabel] = useState("Budget (EUR)");
  const [distCharges, setDistCharges] = useState<DistCharge[]>(DEFAULT_DIST_CHARGES());
  const [distTasks, setDistTasks] = useState<DistTask[]>(DEFAULT_DIST_TASKS());
  const [distPeople, setDistPeople] = useState<string[]>(["Person (1)", "Person (2)"]);

  const distBudget = parseFloat(paidAmount) || 0;
  const distChargesTotal = distCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const distInternalPool = Math.max(0, distBudget - distChargesTotal);
  const distTotalPercent = distTasks.reduce((s, t) => s + (Number(t.percent) || 0), 0);
  const distTaskAmounts = distTasks.map((t) => (distInternalPool * (Number(t.percent) || 0)) / 100);
  const distSplittableTotal = distTasks.reduce((s, t, i) => (t.locked ? s : s + distTaskAmounts[i]), 0);
  const distPerPersonEqual = distPeople.length > 0 ? distSplittableTotal / distPeople.length : 0;
  const distPerPersonPerTask = distTasks.map((t, i) =>
    t.locked || distPeople.length === 0 ? null : distTaskAmounts[i] / distPeople.length,
  );
  const updateDistTask = (id: string, patch: Partial<DistTask>) =>
    setDistTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updateDistCharge = (id: string, patch: Partial<DistCharge>) =>
    setDistCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const uploadFile = async (file: File, kind: "driver" | "proposal" | "process"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${userId}/${opp.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    return path;
  };

  const signedUrl = async (path: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const patch = async (fields: Partial<Opportunity>) => {
    setWorking(true);
    // Optimistic UI: apply immediately for smooth transition, no full re-fetch
    onOptimisticPatch?.(fields);
    const { error } = await supabase.from("consultant_opportunities").update(fields as never).eq("id", opp.id);
    setWorking(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      // Rollback via full reload
      await onChanged();
      return false;
    }
    return true;
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await signedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const advance = async (to: Stage, extra: Partial<Opportunity> = {}) => {
    const ok = await patch({ stage: to, ...extra });
    if (ok) {
      toast({ title: `Advanced to ${STAGES.find(s => s.value === to)?.short}` });
      onStageChange?.(to);
    }
  };

  // ----- Distribution actions -----
  const declareDistributions = async () => {
    if (distTotalPercent !== 100) {
      toast({ title: `Task percentages must total 100% (currently ${distTotalPercent}%)`, variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    // Reset existing rows for this mission
    const del = await supabase.from("consultant_opportunity_distributions").delete().eq("opportunity_id", opp.id);
    if (del.error) { toast({ title: "Failed", description: del.error.message, variant: "destructive" }); return; }
    // Compute per-person amount from splittable tasks
    const perPerson: Record<string, number> = {};
    distPeople.forEach(p => { perPerson[p] = 0; });
    distTasks.forEach((t, i) => {
      if (t.locked || distPeople.length === 0) return;
      const per = distTaskAmounts[i] / distPeople.length;
      distPeople.forEach(p => { perPerson[p] += per; });
    });
    const rows = distPeople.map(p => ({
      opportunity_id: opp.id,
      user_id: userId,
      recipient_name: p,
      amount: Number((perPerson[p] || 0).toFixed(2)),
      percent: distBudget > 0 ? Number((((perPerson[p] || 0) / distBudget) * 100).toFixed(2)) : null,
      declared_at: now,
    })) as never[];
    if (rows.length) {
      const ins = await supabase.from("consultant_opportunity_distributions").insert(rows);
      if (ins.error) { toast({ title: "Failed", description: ins.error.message, variant: "destructive" }); return; }
    }
    await advance("closed");
  };

  const idx = stageIndex(opp.stage);

  return (
    <div>
      {/* Stage tracker (hide when a single stage tab is active) */}
      {onlyStage === null && (
        <div className="flex gap-1 mb-4">
          {STAGES.slice(0, 6).map((s, i) => (
            <div key={s.value} className="flex-1">
              <div className={`h-1.5 rounded ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              <div className={`text-[10px] mt-1 ${i <= idx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.short}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {show("identify") && (
        <StageBlock n={1} title="Catched &mdash; upload the driver" active={opp.stage === "identify"} done={idx > 0}>
            <div className="space-y-2">
              <Label className="text-xs">Driver PDF or screenshot (LinkedIn post, tender, email&hellip;)</Label>
              <FileField
                accept="application/pdf,image/*"
                url={opp.driver_file_url}
                onOpen={() => openFile(opp.driver_file_url)}
                onPick={async (f) => {
                  const p = await uploadFile(f, "driver");
                  if (p) await patch({ driver_file_url: p });
                }}
              />
              <Label className="text-xs mt-2">Note</Label>
              <Textarea rows={2} value={driverNote} onChange={e => setDriverNote(e.target.value)} onBlur={() => driverNote !== (opp.driver_note ?? "") && patch({ driver_note: driverNote })} placeholder="Context, contact, link&hellip;" />
              {opp.stage === "identify" && (
                <Button className="w-full" size="sm" disabled={working || !opp.driver_file_url} onClick={() => advance("propose")}>
                  Next: prepare proposal <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
        </StageBlock>
        )}

        {show("propose") && (
        <StageBlock n={2} title="Technical &amp; financial proposal" active={opp.stage === "propose"} done={idx > 1}>
            <div className="space-y-2">
              <Label className="text-xs">Proposal PDF</Label>
              <FileField
                accept="application/pdf"
                url={opp.proposal_file_url}
                onOpen={() => openFile(opp.proposal_file_url)}
                onPick={async (f) => {
                  const p = await uploadFile(f, "proposal");
                  if (p) await patch({ proposal_file_url: p });
                }}
              />
              {opp.proposal_sent_at && <p className="text-xs text-muted-foreground">Sent {format(new Date(opp.proposal_sent_at), "MMM d, yyyy")}</p>}
              {opp.stage === "propose" && (
                <div className="flex flex-col gap-2">
                  <Button className="w-full" size="sm" disabled={working || !opp.proposal_file_url} onClick={() => advance("propose", { proposal_sent_at: new Date().toISOString() })}>
                    Mark proposal sent
                  </Button>
                  <Button className="w-full" size="sm" variant="outline" disabled={working || !opp.proposal_sent_at} onClick={() => advance("confirm_prepare")}>
                    Client accepted <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
        </StageBlock>
        )}

        {show("confirm_prepare") && (
        <StageBlock n={3} title="Confirm &amp; prepare (process + presentation)" active={opp.stage === "confirm_prepare"} done={idx > 2}>
            <div className="space-y-3">
              {/* Step A: confirm client acceptance */}
              {!opp.client_confirmed_at && opp.stage === "confirm_prepare" && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                  <Button className="w-full" size="sm" disabled={working} onClick={() => patch({ client_confirmed_at: new Date().toISOString() })}>
                    Confirm client acceptance
                  </Button>
                </div>
              )}
              {opp.client_confirmed_at && (
                <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
                  &check; Client accepted {format(new Date(opp.client_confirmed_at), "MMM d, yyyy")}
                </p>
              )}

              {/* Step B: upload PDF &mdash; appears smoothly after acceptance */}
              {opp.client_confirmed_at && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <Label className="text-xs">Process &amp; presentation PDF</Label>
                  <FileField
                    accept="application/pdf,image/*"
                    url={opp.process_file_url}
                    onOpen={() => openFile(opp.process_file_url)}
                    onPick={async (f) => {
                      const p = await uploadFile(f, "process");
                      if (p) await patch({ process_file_url: p });
                    }}
                  />
                </div>
              )}

              {/* Step C: ready to deliver &mdash; only after PDF is uploaded */}
              {opp.stage === "confirm_prepare" && opp.client_confirmed_at && opp.process_file_url && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                  <Button className="w-full" size="sm" disabled={working} onClick={() => advance("deliver")}>
                    Ready to deliver <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
        </StageBlock>
        )}

        {show("deliver") && (
        <StageBlock n={4} title="Deliver &mdash; workshop / training / consulting" active={opp.stage === "deliver"} done={idx > 3}>
            <div className="space-y-2">
              {opp.delivered_at && <p className="text-xs text-muted-foreground">Delivered {format(new Date(opp.delivered_at), "MMM d, yyyy")}</p>}
              {opp.stage === "deliver" && (
                <Button className="w-full" size="sm" disabled={working} onClick={() => advance("payment_distribution", { delivered_at: new Date().toISOString() })}>
                  Confirm delivered &mdash; awaiting payment <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
        </StageBlock>
        )}

        {show("payment_distribution") && (
        <StageBlock n={5} title="Payment received &amp; distribution" active={opp.stage === "payment_distribution"} done={opp.stage === "closed"}>
            <div className="space-y-3">
              {opp.stage !== "closed" ? (
                <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                <div>
                  <Label className="text-xs">Amount paid ({opp.currency || "EUR"})</Label>
                  <Input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                </div>
                <div className="flex items-end">
                  {opp.paid_at
                    ? <p className="text-xs text-muted-foreground">Paid {format(new Date(opp.paid_at), "MMM d, yyyy")}</p>
                    : opp.stage === "payment_distribution" && (
                      <Button className="w-full" size="sm" disabled={working || !paidAmount} onClick={() => patch({ paid_amount: parseFloat(paidAmount), paid_at: new Date().toISOString(), is_completed: true, completed_at: new Date().toISOString() })}>
                        Confirm budget paid
                      </Button>
                    )
                  }
                </div>
              </div>

              {/* Mission Setup */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold mb-2">Mission Setup</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Mission title</Label>
                      <Input value={opp.title} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{budgetLabel}</Label>
                      <Input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Budget label</Label>
                      <Input value={budgetLabel} onChange={e => setBudgetLabel(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Charges */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold">Charges</div>
                    <Button size="sm" variant="outline" className="self-start sm:self-auto" onClick={() => setDistCharges(p => [...p, { id: distUid(), label: "New charge", amount: 0 }])}>
                      <Plus className="w-3 h-3 mr-1" /> Add charge
                    </Button>
                  </div>
                  <div className="overflow-x-auto -mx-5 px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-40 text-right">Amount</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distCharges.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Input value={c.label} onChange={e => updateDistCharge(c.id, { label: e.target.value })} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="text-right" value={c.amount} onChange={e => updateDistCharge(c.id, { amount: parseFloat(e.target.value) || 0 })} />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => setDistCharges(p => p.filter(x => x.id !== c.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/40">
                        <TableCell>Total charges</TableCell>
                        <TableCell className="text-right">{distFmt(distChargesTotal)}</TableCell>
                        <TableCell />
                      </TableRow>
                      <TableRow className="font-semibold">
                        <TableCell>Infra &amp; Structure (Budget &minus; Charges)</TableCell>
                        <TableCell className="text-right">{distFmt(distInternalPool)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </div>

                {/* People */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold">People splitting the pool</div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDistPeople(p => [...p, `Person (${p.length + 1})`])}>
                        <Plus className="w-3 h-3 mr-1" /> Add person
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDistPeople(p => (p.length > 1 ? p.slice(0, -1) : p))}>
                        <Trash2 className="w-3 h-3 mr-1" /> Remove last
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {distPeople.map((p, i) => (
                      <Input key={i} value={p} onChange={e => setDistPeople(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} className="w-48" />
                    ))}
                  </div>
                </div>

                {/* Task distribution */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold">Internal &amp; Structure &mdash; task distribution</div>
                    <Button size="sm" variant="outline" className="self-start sm:self-auto" onClick={() => setDistTasks(p => {
                      const lockedIdx = p.findIndex(t => t.locked);
                      const newTask: DistTask = { id: distUid(), label: "New task", percent: 0 };
                      if (lockedIdx === -1) return [...p, newTask];
                      const copy = [...p]; copy.splice(lockedIdx, 0, newTask); return copy;
                    })}>
                      <Plus className="w-3 h-3 mr-1" /> Add task
                    </Button>
                  </div>
                  <div className="overflow-x-auto -mx-5 px-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead className="w-32 text-right">%</TableHead>
                        <TableHead className="w-36 text-right">Amount</TableHead>
                        {distPeople.map((p, i) => (
                          <TableHead key={i} className="text-right bg-foreground text-background">{p}</TableHead>
                        ))}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distTasks.map((t, i) => (
                        <TableRow key={t.id} className={t.locked ? "bg-muted/30" : ""}>
                          <TableCell>
                            {t.locked ? (
                              <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                {t.label}
                                <span className="text-xs text-muted-foreground ml-1">(not split)</span>
                              </div>
                            ) : (
                              <Input value={t.label} onChange={e => updateDistTask(t.id, { label: e.target.value })} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="text-right" value={t.percent} onChange={e => updateDistTask(t.id, { percent: parseFloat(e.target.value) || 0 })} />
                          </TableCell>
                          <TableCell className="text-right font-mono">{distFmt(distTaskAmounts[i])}</TableCell>
                          {distPeople.map((_, pi) => (
                            <TableCell key={pi} className="text-right font-mono">
                              {distPerPersonPerTask[i] === null ? "&mdash;" : distFmt(distPerPersonPerTask[i] as number)}
                            </TableCell>
                          ))}
                          <TableCell>
                            {!t.locked && (
                              <Button size="icon" variant="ghost" onClick={() => setDistTasks(p => p.filter(x => x.id !== t.id))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/40">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{distTotalPercent}%</TableCell>
                        <TableCell className="text-right">{distFmt(distTaskAmounts.reduce((s, a) => s + a, 0))}</TableCell>
                        {distPeople.map((_, i) => (
                          <TableCell key={i} className="text-right bg-foreground text-background">{distFmt(distPerPersonEqual)}</TableCell>
                        ))}
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                  {distTotalPercent !== 100 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Task percentages sum to {distTotalPercent}% &mdash; adjust to reach 100% for a full distribution.
                    </p>
                  )}
                </div>

                {distributions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Declared splits: {distributions.map(d => `${d.recipient_name} (${d.percent ?? 0}% &middot; ${Number(d.amount ?? 0).toLocaleString()} ${opp.currency || "EUR"})`).join(" &middot; ")}
                  </div>
                )}

                {opp.stage === "payment_distribution" && opp.paid_at && (
                  <Button size="sm" className="w-full" disabled={working} onClick={declareDistributions}>
                    Declare distribution &amp; close mission
                  </Button>
                )}
                </div>
                </div>
              ) : null}

                {opp.stage === "closed" && (

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Accounting &mdash; mission closed</div>
                        <p className="text-xs text-muted-foreground">
                          {opp.client_name || "&mdash;"}
                          {opp.paid_at && <> &middot; paid {format(new Date(opp.paid_at), "MMM d, yyyy")}</>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">
                          {Number(opp.paid_amount ?? opp.total_amount ?? 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{opp.currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Steps preview */}
                    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps recap</div>
                      <div className="grid grid-cols-1 gap-1.5 text-xs">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">1. Catched</span>
                            <span className="text-muted-foreground"> &mdash; source: {SOURCES.find(s => s.value === opp.source)?.label || opp.source}</span>
                            {opp.driver_file_url && <button className="ml-2 text-primary underline" onClick={() => openFile(opp.driver_file_url)}>driver</button>}
                            {opp.driver_note && <div className="text-muted-foreground italic">"{opp.driver_note}"</div>}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">2. Proposal</span>
                            <span className="text-muted-foreground">
                              {opp.proposal_sent_at ? ` &mdash; sent ${format(new Date(opp.proposal_sent_at), "MMM d, yyyy")}` : " &mdash; sent"}
                            </span>
                            {opp.proposal_file_url && <button className="ml-2 text-primary underline" onClick={() => openFile(opp.proposal_file_url)}>file</button>}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">3. Confirm &amp; prepare</span>
                            <span className="text-muted-foreground">
                              {opp.client_confirmed_at && ` &mdash; confirmed ${format(new Date(opp.client_confirmed_at), "MMM d, yyyy")}`}
                            </span>
                            {opp.process_file_url && <button className="ml-2 text-primary underline" onClick={() => openFile(opp.process_file_url)}>process</button>}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">4. Deliver</span>
                            <span className="text-muted-foreground">
                              {opp.delivered_at && ` &mdash; delivered ${format(new Date(opp.delivered_at), "MMM d, yyyy")}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium">5. receive and distribute</span>
                            <span className="text-muted-foreground">
                              {opp.paid_at && ` &mdash; paid ${format(new Date(opp.paid_at), "MMM d, yyyy")}`}
                              {" &middot; "}{budgetLabel}: {distFmt(Number(opp.paid_amount ?? opp.total_amount ?? 0))} {opp.currency}
                              {" &middot; charges: "}{distFmt(distChargesTotal)}
                              {" &middot; pool: "}{distFmt(distInternalPool)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Distribution recap table */}
                    {distributions.length > 0 && (
                      <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distribution recap</div>
                        <div className="overflow-x-auto -mx-3 px-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Recipient</TableHead>
                              <TableHead className="text-right">%</TableHead>
                              <TableHead className="text-right">Amount ({opp.currency || "EUR"})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {distributions.map(d => (
                              <TableRow key={d.id}>
                                <TableCell className="font-medium">{d.recipient_name}</TableCell>
                                <TableCell className="text-right">{d.percent ?? 0}%</TableCell>
                                <TableCell className="text-right font-mono">{distFmt(Number(d.amount ?? 0))}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-semibold bg-muted/40">
                              <TableCell>Total distributed</TableCell>
                              <TableCell className="text-right">{distributions.reduce((s, d) => s + (d.percent ?? 0), 0)}%</TableCell>
                              <TableCell className="text-right font-mono">{distFmt(distributions.reduce((s, d) => s + Number(d.amount ?? 0), 0))}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

        </StageBlock>
        )}
      </div>
    </div>
  );
}

function StageBlock({
  n, title, active, done, children,
}: { n: number; title: string; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <div className={`border rounded-lg p-3 ${active ? "border-primary bg-primary/5" : done ? "opacity-80" : "opacity-60"}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {done ? <CheckCircle2 className="w-3 h-3" /> : n}
        </div>
        <div className="text-sm font-medium flex items-center gap-1"><FileText className="w-3 h-3" />{title}</div>
      </div>
      {children}
    </div>
  );
}

function FileField({
  url, accept, onPick, onOpen,
}: {
  url: string | null;
  accept: string;
  onPick: (file: File) => Promise<void>;
  onOpen: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { await onPick(f); } finally { setUploading(false); }
    // reset input so choosing same filename again re-triggers change
    if (inputRef.current) inputRef.current.value = "";
  };

  const filename = url ? url.split("/").pop() || "file" : null;
  const shortName = filename && filename.length > 32 ? filename.slice(0, 28) + "&hellip;" + filename.slice(-6) : filename;

  return (
    <div className="rounded-md border border-border bg-background">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {uploading ? (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading&hellip;
        </div>
      ) : url ? (
        <div className="flex flex-wrap items-center gap-2 p-2.5">
          <div className="flex items-center gap-2 min-w-0 text-sm basis-full sm:basis-0 sm:flex-1">
            <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">File uploaded</div>
              <div className="text-xs text-muted-foreground truncate">{shortName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="ghost" onClick={onOpen}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />View
            </Button>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Replace
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2 p-3 text-sm text-muted-foreground hover:bg-muted/40 transition"
        >
          <Upload className="w-4 h-4" />
          <span>Click to upload PDF or screenshot</span>
        </button>
      )}
    </div>
  );
}
