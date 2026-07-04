import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Briefcase, CheckCircle2, TrendingUp, DollarSign,
  FileText, Upload, ArrowRight, Users, Trash2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

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
  { value: "identify",             label: "1. Identify opportunity",    short: "Identify",     icon: Briefcase },
  { value: "propose",              label: "2. Send proposal",           short: "Propose",      icon: FileText },
  { value: "confirm_prepare",      label: "3. Confirm & prepare",       short: "Prepare",      icon: CheckCircle2 },
  { value: "deliver",              label: "4. Deliver",                 short: "Deliver",      icon: ArrowRight },
  { value: "payment_distribution", label: "5. Payment",                 short: "Payment",      icon: DollarSign },
  { value: "closed",               label: "6. Distribution / Closed",   short: "Distribution", icon: Users },
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

  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);

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
    const { error } = await supabase.from("consultant_opportunities").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity added", description: "Now upload the driver (PDF / screenshot) in the pipeline." });
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(OPEN_KEY); } catch {}
    load();
  };

  // ---------- Financial totals ----------
  const paid = items.filter(i => i.stage === "closed" || i.stage === "payment_distribution" || i.paid_at);
  const closed = items.filter(i => i.stage === "closed");
  const pipeline = items.filter(i => i.stage !== "closed");
  const totalRevenue = items.reduce((sum, i) => sum + Number(i.paid_amount ?? 0), 0);
  const activeClients = new Set(items.filter(i => i.paid_at).map(i => i.client_name).filter(Boolean)).size;
  const milestonePct = Math.min(100, (closed.length / MILESTONE) * 100);

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h1 className="text-3xl font-bold tracking-tight">Consulting Growth</h1>
          <p className="text-muted-foreground mt-1">
            5-stage pipeline: Identify → Propose → Prepare → Deliver → Payment &amp; distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> New opportunity</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New consulting / training opportunity</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Digital Security Training – Bank X" /></div>
                <div><Label>Client / prospect</Label><Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Days</Label><Input type="number" value={form.number_of_days} onChange={e => setForm({ ...form, number_of_days: e.target.value })} /></div>
                  <div><Label>Per day</Label><Input type="number" value={form.amount_per_day} onChange={e => setForm({ ...form, amount_per_day: e.target.value })} /></div>
                  <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} maxLength={3} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What is this opportunity about?" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving}>{saving ? "Saving…" : "Add opportunity"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Briefcase, label: "Pipeline", value: pipeline.length },
          { icon: CheckCircle2, label: "Closed missions", value: closed.length },
          { icon: DollarSign, label: "Total revenue", value: `${totalRevenue.toLocaleString()}`, suffix: "EUR" },
          { icon: TrendingUp, label: "Paid clients", value: activeClients },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <s.icon className="w-4 h-4" />{s.label}
            </div>
            <div className="text-2xl font-bold">
              {s.value} {s.suffix && <span className="text-sm font-normal text-muted-foreground">{s.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Milestone */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-foreground">Brand entity unlock</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Reach {MILESTONE} closed missions to launch your own brand.</p>
          </div>
          <Badge variant={closed.length >= MILESTONE ? "default" : "outline"}>{closed.length}/{MILESTONE}</Badge>
        </div>
        <Progress value={milestonePct} />
      </div>

      {/* Pipeline */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pipeline</h2>
          <p className="text-sm text-muted-foreground">Click a mission to advance it through the 5 stages.</p>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : pipeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Nothing in the pipeline yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first opportunity to start the 5-stage flow.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pipeline.map(o => {
              const idx = stageIndex(o.stage);
              return (
                <button
                  key={o.id}
                  onClick={() => setActiveOpp(o)}
                  className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{o.title}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground truncate">{o.client_name || "—"}</p>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{o.source}</Badge>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{STAGES[idx]?.short}</Badge>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {STAGES.slice(0, 5).map((s, i) => (
                      <div
                        key={s.value}
                        className={`h-1.5 flex-1 rounded ${i <= idx ? "bg-primary" : "bg-muted"}`}
                        title={s.short}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted-foreground">
                      {o.total_amount ? `${Number(o.total_amount).toLocaleString()} ${o.currency}` : ""}
                    </span>
                    <span className="text-primary inline-flex items-center">
                      Manage <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounting */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Accounting</h2>
          <p className="text-sm text-muted-foreground">Paid missions and distributions.</p>
        </div>
        {paid.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No paid missions yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {paid.map(o => {
              const dists = distByOpp[o.id] || [];
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{o.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {o.client_name || "—"}
                        {o.paid_at && <> · paid {format(new Date(o.paid_at), "MMM d, yyyy")}</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {Number(o.paid_amount ?? o.total_amount ?? 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{o.currency}</span>
                      </div>
                    </div>
                  </div>
                  {dists.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {dists.map(d => (
                        <Badge key={d.id} variant="outline" className="text-[10px]">
                          {d.recipient_name} · {d.percent ? `${d.percent}%` : ""}{d.amount ? ` ${Number(d.amount).toLocaleString()}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end mt-4 text-xs text-primary">
                    <button onClick={() => setActiveOpp(o)} className="inline-flex items-center hover:underline">
                      Manage <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeOpp && (
        <StageManager
          opp={activeOpp}
          distributions={distByOpp[activeOpp.id] || []}
          onClose={() => setActiveOpp(null)}
          onChanged={async () => { await load(); }}
          userId={user?.id ?? ""}
        />
      )}
    </div>
  );
}

// =============================================================================
// Stage manager dialog
// =============================================================================

function StageManager({
  opp, distributions, onClose, onChanged, userId,
}: {
  opp: Opportunity;
  distributions: Distribution[];
  onClose: () => void;
  onChanged: () => Promise<void>;
  userId: string;
}) {
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const [driverNote, setDriverNote] = useState(opp.driver_note ?? "");
  const [paidAmount, setPaidAmount] = useState(String(opp.paid_amount ?? opp.total_amount ?? ""));
  const [newRecipient, setNewRecipient] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newAmount, setNewAmount] = useState("");

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
    const { error } = await supabase.from("consultant_opportunities").update(fields as never).eq("id", opp.id);
    setWorking(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    await onChanged();
    return true;
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await signedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const advance = async (to: Stage, extra: Partial<Opportunity> = {}) => {
    const ok = await patch({ stage: to, ...extra });
    if (ok) toast({ title: `Advanced to ${STAGES.find(s => s.value === to)?.short}` });
  };

  // ----- Distribution actions -----
  const addDistribution = async () => {
    if (!newRecipient.trim()) {
      toast({ title: "Recipient name required", variant: "destructive" });
      return;
    }
    const payload = {
      opportunity_id: opp.id,
      user_id: userId,
      recipient_name: newRecipient.trim(),
      percent: newPercent ? parseFloat(newPercent) : null,
      amount: newAmount ? parseFloat(newAmount) : null,
    } as never;
    const { error } = await supabase.from("consultant_opportunity_distributions").insert(payload);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setNewRecipient(""); setNewPercent(""); setNewAmount("");
    await onChanged();
  };

  const removeDistribution = async (id: string) => {
    const { error } = await supabase.from("consultant_opportunity_distributions").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await onChanged();
  };

  const declareDistributions = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("consultant_opportunity_distributions")
      .update({ declared_at: now } as never)
      .eq("opportunity_id", opp.id)
      .is("declared_at", null);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await advance("closed");
  };

  const totalPct = distributions.reduce((s, d) => s + Number(d.percent ?? 0), 0);
  const totalAmt = distributions.reduce((s, d) => s + Number(d.amount ?? 0), 0);
  const idx = stageIndex(opp.stage);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{opp.title}</DialogTitle>
          <div className="text-xs text-muted-foreground">{opp.client_name || "—"} · {opp.source}</div>
        </DialogHeader>

        {/* Stage tracker */}
        <div className="flex gap-1 my-3">
          {STAGES.slice(0, 5).map((s, i) => (
            <div key={s.value} className="flex-1">
              <div className={`h-1.5 rounded ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              <div className={`text-[10px] mt-1 ${i <= idx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.short}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* STAGE 1: Identify + driver */}
          <StageBlock n={1} title="Identify — upload the driver" active={opp.stage === "identify"} done={idx > 0}>
            <div className="space-y-2">
              <Label className="text-xs">Driver PDF or screenshot (LinkedIn post, tender, email…)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf,image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const p = await uploadFile(f, "driver");
                  if (p) await patch({ driver_file_url: p });
                }} />
                {opp.driver_file_url && (
                  <Button size="sm" variant="ghost" onClick={() => openFile(opp.driver_file_url)}>
                    <ExternalLink className="w-3 h-3 mr-1" />View
                  </Button>
                )}
              </div>
              <Label className="text-xs mt-2">Note</Label>
              <Textarea rows={2} value={driverNote} onChange={e => setDriverNote(e.target.value)} onBlur={() => driverNote !== (opp.driver_note ?? "") && patch({ driver_note: driverNote })} placeholder="Context, contact, link…" />
              {opp.stage === "identify" && (
                <Button size="sm" disabled={working || !opp.driver_file_url} onClick={() => advance("propose")}>
                  Next: prepare proposal <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </StageBlock>

          {/* STAGE 2: Propose */}
          <StageBlock n={2} title="Technical & financial proposal" active={opp.stage === "propose"} done={idx > 1}>
            <div className="space-y-2">
              <Label className="text-xs">Proposal PDF</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const p = await uploadFile(f, "proposal");
                  if (p) await patch({ proposal_file_url: p });
                }} />
                {opp.proposal_file_url && (
                  <Button size="sm" variant="ghost" onClick={() => openFile(opp.proposal_file_url)}>
                    <ExternalLink className="w-3 h-3 mr-1" />View
                  </Button>
                )}
              </div>
              {opp.proposal_sent_at && <p className="text-xs text-muted-foreground">Sent {format(new Date(opp.proposal_sent_at), "MMM d, yyyy")}</p>}
              {opp.stage === "propose" && (
                <div className="flex gap-2">
                  <Button size="sm" disabled={working || !opp.proposal_file_url} onClick={() => advance("propose", { proposal_sent_at: new Date().toISOString() })}>
                    Mark proposal sent
                  </Button>
                  <Button size="sm" variant="outline" disabled={working || !opp.proposal_sent_at} onClick={() => advance("confirm_prepare")}>
                    Client accepted <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </StageBlock>

          {/* STAGE 3: Confirm & Prepare */}
          <StageBlock n={3} title="Confirm & prepare (process + presentation)" active={opp.stage === "confirm_prepare"} done={idx > 2}>
            <div className="space-y-2">
              {opp.client_confirmed_at
                ? <p className="text-xs text-muted-foreground">Confirmed {format(new Date(opp.client_confirmed_at), "MMM d, yyyy")}</p>
                : opp.stage === "confirm_prepare" && (
                    <Button size="sm" variant="outline" disabled={working} onClick={() => patch({ client_confirmed_at: new Date().toISOString() })}>
                      Confirm client acceptance
                    </Button>
                  )
              }
              <Label className="text-xs">Process & presentation PDF</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const p = await uploadFile(f, "process");
                  if (p) await patch({ process_file_url: p });
                }} />
                {opp.process_file_url && (
                  <Button size="sm" variant="ghost" onClick={() => openFile(opp.process_file_url)}>
                    <ExternalLink className="w-3 h-3 mr-1" />View
                  </Button>
                )}
              </div>
              {opp.stage === "confirm_prepare" && (
                <Button size="sm" disabled={working || !opp.client_confirmed_at || !opp.process_file_url} onClick={() => advance("deliver")}>
                  Ready to deliver <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </StageBlock>

          {/* STAGE 4: Deliver */}
          <StageBlock n={4} title="Deliver — workshop / training / consulting" active={opp.stage === "deliver"} done={idx > 3}>
            <div className="space-y-2">
              {opp.delivered_at && <p className="text-xs text-muted-foreground">Delivered {format(new Date(opp.delivered_at), "MMM d, yyyy")}</p>}
              {opp.stage === "deliver" && (
                <Button size="sm" disabled={working} onClick={() => advance("payment_distribution", { delivered_at: new Date().toISOString() })}>
                  Confirm delivered — awaiting payment <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </StageBlock>

          {/* STAGE 5: Payment + distribution */}
          <StageBlock n={5} title="Payment received & distribution" active={opp.stage === "payment_distribution"} done={opp.stage === "closed"}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Amount paid ({opp.currency || "EUR"})</Label>
                  <Input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                </div>
                <div className="flex items-end">
                  {opp.paid_at
                    ? <p className="text-xs text-muted-foreground">Paid {format(new Date(opp.paid_at), "MMM d, yyyy")}</p>
                    : (opp.stage === "payment_distribution" || opp.stage === "closed") && (
                      <Button size="sm" disabled={working || !paidAmount} onClick={() => patch({ paid_amount: parseFloat(paidAmount), paid_at: new Date().toISOString(), is_completed: true, completed_at: new Date().toISOString() })}>
                        Confirm budget paid
                      </Button>
                    )
                  }
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium"><Users className="w-4 h-4" />Distribution</div>
                  <div className="text-xs text-muted-foreground">
                    {distributions.length === 0 ? "No splits — 100% to you"
                      : `${totalPct}% · ${totalAmt.toLocaleString()} ${opp.currency || "EUR"}`}
                  </div>
                </div>

                <div className="space-y-1">
                  {distributions.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-sm p-2 border rounded">
                      <span className="flex-1 truncate">{d.recipient_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.percent ? `${d.percent}%` : ""} {d.amount ? `${Number(d.amount).toLocaleString()}` : ""}
                      </span>
                      {d.declared_at && <Badge variant="outline" className="text-[10px]">declared</Badge>}
                      <Button size="icon" variant="ghost" onClick={() => removeDistribution(d.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_80px_100px_auto] gap-2 mt-2">
                  <Input placeholder="Recipient (or yourself)" value={newRecipient} onChange={e => setNewRecipient(e.target.value)} />
                  <Input placeholder="%" type="number" value={newPercent} onChange={e => setNewPercent(e.target.value)} />
                  <Input placeholder="Amount" type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={addDistribution}><Plus className="w-3 h-3" /></Button>
                </div>

                {opp.stage === "payment_distribution" && opp.paid_at && (
                  <Button size="sm" className="w-full mt-3" disabled={working} onClick={declareDistributions}>
                    Declare distribution & close mission
                  </Button>
                )}
                {opp.stage === "closed" && (
                  <Badge className="mt-2">Mission closed</Badge>
                )}
              </div>
            </div>
          </StageBlock>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
