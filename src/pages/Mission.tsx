// Dedicated page for a single mission distribution.
// One page per mission, created from a distribution model in an organization.
// Same visual language as /distribution, but scoped to this mission only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Briefcase,
  Save,
  Loader2,
  ClipboardList,
  Users,
  ListChecks,
  Wallet,
  ArrowLeft,
  FileDown,
  Check,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { exportMissionPdf } from "@/lib/missionPdfExport";
import { fetchMissionProducts, type MissionProduct } from "@/hooks/useMissionProducts";
import { MissionProductSelect } from "@/components/organization/MissionProductSelect";

type Task = { id: string; label: string; percent: number; locked?: boolean; thirdParty?: boolean; amount?: number; personShares?: number[] };
type Charge = { id: string; label: string; amount: number; fixed?: boolean; percent?: number; system?: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);
const isReserveLabel = (label: string) =>
  /structural reserve|restes? (de )?(la )?structure|rest (for the )?structure/.test(
    String(label || "").trim().toLowerCase(),
  );
// The structural reserve is always present, counted as an amount, never split per person.
const normalizeTaskLocks = (items: Task[]): Task[] => {
  const mapped: Task[] = items.map((task): Task => {
    if (isReserveLabel(task.label)) return { ...task, locked: true };
    const { locked: _locked, ...splitTask } = task;
    return splitTask;
  });
  // Order: task-force tasks, then third-party charges, then the reserve last.
  const regular = mapped.filter((t) => !t.locked && !t.thirdParty);
  const thirdParty = mapped.filter((t) => !t.locked && t.thirdParty);
  const reserves = mapped.filter((t) => t.locked);
  if (reserves.length) return [...regular, ...thirdParty, ...reserves];
  const used = regular.reduce((s, t) => s + (Number(t.percent) || 0), 0);
  return [...regular, ...thirdParty, { id: uid(), label: "Structural reserve", percent: Math.max(0, 100 - used), locked: true }];
};
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export default function Mission() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [iteration, setIteration] = useState(1);
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState("TND");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<string[]>(["Person (1)", "Person (2)"]);
  const [modelName, setModelName] = useState<string>("");
  const [orgSlug, setOrgSlug] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [products, setProducts] = useState<MissionProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDate, setPdfDate] = useState("");
  const [pdfContext, setPdfContext] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productError, setProductError] = useState(false);

  // Collapsible distribution sections, remembered per mission.
  const COLLAPSE_KEY = `mission-card-collapse:${id || "new"}`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mission-card-collapse:${id || "new"}`) || "{}");
    } catch {
      return {};
    }
  });
  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });

  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const readyRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await (supabase.from("distribution_records" as never) as never as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setClient(data.client || "");
    setTitle(data.title || "");
    setIteration(Number(data.iteration) || 1);
    setBudget(Number(data.budget) || 0);
    setCurrency(data.currency || "TND");
    setCharges(Array.isArray(data.charges) ? data.charges : []);
    setTasks(normalizeTaskLocks(Array.isArray(data.tasks) ? data.tasks : []));
    setPeople(Array.isArray(data.people) && data.people.length ? data.people : ["Person (1)", "Person (2)"]);
    setModelName(data.budget_label && data.budget_label !== "Budget" ? data.budget_label : "");
    setPdfDate(String(data.created_at || "").slice(0, 10));
    setLoading(false);
    readyRef.current = false;
    setDirty(false);
    setTimeout(() => {
      readyRef.current = true;
    }, 0);
    // A mission belongs to one organization's Distribution workspace: the folder id is
    // the part of `kind` before ":". Resolve it so Back returns to that workspace.
    setOrgSlug("");
    setProducts([]);
    setProductId("");
    setOrganizationName("");
    const folderId = String(data.kind || "").split(":")[0];
    if (!folderId) return;
    const { data: folder } = await (supabase.from("distribution_entities" as never) as never as any)
      .select("org_id")
      .eq("id", folderId)
      .maybeSingle();
    const orgId = (folder as { org_id?: string } | null)?.org_id;
    if (!orgId) return;
    setProductsLoading(true);
    try {
      const [{ data: org }, orgProducts] = await Promise.all([
        supabase.from("organizations").select("slug, name").eq("id", orgId).maybeSingle(),
        fetchMissionProducts(orgId),
      ]);
      if (org?.slug) setOrgSlug(org.slug);
      setOrganizationName(org?.name || "");
      setProducts(orgProducts);
      const matched = orgProducts.find((p) => p.name === data.title);
      if (matched) {
        setProductId(matched.id);
        setIteration(matched.shippedCount);
      }
      setProductError(false);
    } catch {
      setProductError(true);
    } finally {
      setProductsLoading(false);
    }

  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProduct = (product: MissionProduct) => {
    setProductId(product.id);
    setTitle(product.name);
    setIteration(product.shippedCount);
    setDirty(true);
  };

  // Percentage-driven charges keep their amount in sync with the budget.
  useEffect(() => {
    const budgetNum = Number(budget) || 0;
    setCharges((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (!c.fixed || c.percent === undefined || c.percent === null) return c;
        const amount = Math.round(((Number(c.percent) || 0) / 100) * budgetNum * 100) / 100;
        if (amount === c.amount) return c;
        changed = true;
        return { ...c, amount };
      });
      return changed ? next : prev;
    });
  }, [budget]);

  useEffect(() => {
    if (readyRef.current) setDirty(true);
  }, [client, title, iteration, budget, currency, charges, tasks, people]);

  const chargesTotal = useMemo(() => charges.reduce((s, c) => s + (Number(c.amount) || 0), 0), [charges]);
  const internalPool = Math.max(0, (Number(budget) || 0) - chargesTotal);
  // Reste Structure is a percentage of the FULL budget; the Operation Task Force
  // pool is what remains of the pool after the reserve is taken out.
  const reserveTask = tasks.find((t) => t.locked);
  const reservePercent = Number(reserveTask?.percent) || 0;
  const reserveAmount = ((Number(budget) || 0) * reservePercent) / 100;
  // Third-party charges are fixed amounts paid out of the pool; their % is derived from the budget.
  const thirdPartyTasks = tasks.filter((t) => t.thirdParty && !t.locked);
  const thirdPartyTotal = thirdPartyTasks.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const opPool = Math.max(0, internalPool - reserveAmount - thirdPartyTotal);
  const totalPercent = useMemo(
    () => tasks.filter((t) => !t.locked && !t.thirdParty).reduce((s, t) => s + (Number(t.percent) || 0), 0),
    [tasks],
  );
  const taskAmounts = tasks.map((t) =>
    t.locked ? reserveAmount : t.thirdParty ? Number(t.amount) || 0 : (opPool * (Number(t.percent) || 0)) / 100,
  );

  const getShares = (t: Task): number[] => {
    const n = people.length;
    if (n === 0) return [];
    const eq = 100 / n;
    return Array.from({ length: n }, (_, i) => {
      const v = t.personShares?.[i];
      return v === undefined || v === null || Number.isNaN(v) ? eq : Number(v);
    });
  };
  const taskShareSum = (t: Task) => getShares(t).reduce((s, v) => s + v, 0);
  const perPersonPerTask: (number | null)[][] = tasks.map((t, i) => {
    if (t.locked || t.thirdParty || people.length === 0) return people.map(() => null);
    return getShares(t).map((s) => (taskAmounts[i] * s) / 100);
  });
  const perPersonTotal = people.map((_, pi) =>
    perPersonPerTask.reduce((s, row) => s + (typeof row[pi] === "number" ? (row[pi] as number) : 0), 0),
  );

  const updateTask = (tid: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === tid ? { ...t, ...patch } : t)));
  const updateTaskShare = (tid: string, personIdx: number, value: number) =>
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        const shares = getShares(t);
        shares[personIdx] = Number.isFinite(value) ? value : 0;
        return { ...t, personShares: shares };
      }),
    );
  const updateCharge = (cid: string, patch: Partial<Charge>) =>
    setCharges((prev) => prev.map((c) => (c.id === cid ? { ...c, ...patch } : c)));

  const addTask = () =>
    setTasks((p) => {
      const insertIdx = p.findIndex((t) => t.locked || t.thirdParty);
      const newTask: Task = { id: uid(), label: "New task", percent: 0 };
      if (insertIdx === -1) return [...p, newTask];
      const copy = [...p];
      copy.splice(insertIdx, 0, newTask);
      return copy;
    });
  const addThirdParty = () =>
    setTasks((p) => {
      const lockedIdx = p.findIndex((t) => t.locked);
      const newCharge: Task = { id: uid(), label: "Third party charge", percent: 0, amount: 0, thirdParty: true };
      if (lockedIdx === -1) return [...p, newCharge];
      const copy = [...p];
      copy.splice(lockedIdx, 0, newCharge);
      return copy;
    });

  // Server persistence. `silent` is used by the autosave loop.
  const persist = useCallback(
    async (silent = false) => {
      if (!id || !user) {
        if (!silent) toast.error("Sign in to save this mission.");
        return false;
      }
      if (!title.trim()) {
        if (!silent) toast.error("Mission title is required.");
        return false;
      }
      const selectedProduct = products.find((p) => p.id === productId);
      if (productsLoading || productError || !selectedProduct) {
        if (!silent) toast.error("Select a shipped organization product as the mission title.");
        return false;
      }
      setSaving(true);
      const { data, error } = await (supabase.from("distribution_records" as never) as never as any)
        .update({
          client: client.trim() || null,
          title: selectedProduct.name,
          iteration: selectedProduct.shippedCount,
          budget,
          currency,
          charges,
          tasks,
          people,
        })
        .eq("id", id)
        .select("id");
      setSaving(false);
      if (error) {
        if (!silent) toast.error(error.message);
        return false;
      }
      if (!Array.isArray(data) || data.length === 0) {
        if (!silent) toast.error("You do not have permission to edit this mission.");
        return false;
      }
      setSavedAt(new Date());
      setDirty(false);
      return true;
    },
    [id, user, title, client, iteration, budget, currency, charges, tasks, people, products, productId, productsLoading, productError],
  );

  const save = async () => {
    if (totalPercent !== 100) {
      toast.warning(`Saved, but task percentages total ${totalPercent}% (should be 100%).`);
    }
    const ok = await persist(false);
    if (ok && totalPercent === 100) toast.success("Mission distribution saved.");
  };

  // Autosave every change (debounced) so nothing lives only in the browser.
  useEffect(() => {
    if (loading || notFound || !dirty) return;
    const t = setTimeout(() => void persist(true), 1200);
    return () => clearTimeout(t);
  }, [dirty, loading, notFound, persist]);

  const downloadPdf = () => {
    try {
    exportMissionPdf({
      title,
      client,
      date: pdfDate,
      context: pdfContext.trim(),
      organizationName,
      operationPool: opPool,
      reserveAmount,
      thirdPartyTotal,
      iteration,
      modelName,
      budget: Number(budget) || 0,
      currency,
      chargesTotal,
      internalPool,
      totalPercent,
      charges: charges.map((c) => {
        const budgetNum = Number(budget) || 0;
        const pct =
          c.fixed && c.percent !== undefined && c.percent !== null
            ? Number(c.percent)
            : budgetNum > 0
              ? Math.round(((Number(c.amount) || 0) / budgetNum) * 10000) / 100
              : 0;
        return { label: c.label, percent: pct, amount: Number(c.amount) || 0 };
      }),
      people,
      perPersonTotal,
      tasks: tasks.map((t, i) => ({
        label: t.label,
        percent: Number(t.percent) || 0,
        amount: taskAmounts[i] || 0,
        locked: t.locked,
        thirdParty: t.thirdParty,
        perPerson: perPersonPerTask[i],
      })),
    });
    setPdfOpen(false);
    } catch {
      toast.error("The PDF could not be exported. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-24 pb-16">
          <div className="container mx-auto max-w-6xl px-4 space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (orgSlug ? navigate(`/org/${orgSlug}?tab=distribution`) : navigate(-1))}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>


            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading mission…
                </CardContent>
              </Card>
            ) : notFound ? (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  This mission page does not exist or you do not have access to it.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-b4-teal/10 p-6">
                  <Badge variant="outline" className="mb-2 gap-1">
                    <Wallet className="h-3 w-3" /> Mission page
                  </Badge>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {title || "Untitled mission"}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    {client ? <>Client · <strong className="text-foreground">{client}</strong> · </> : null}
                    Iteration ({iteration}){modelName ? <> · model {modelName}</> : null}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPdfOpen(true)}>
                      <FileDown className="mr-1 h-4 w-4" /> Export PDF
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving}>
                      {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                      Save mission
                    </Button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {saving ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                        </>
                      ) : dirty ? (
                        "Unsaved changes"
                      ) : savedAt ? (
                        <>
                          <Check className="h-3 w-3 text-b4-teal" /> Saved{" "}
                          {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </>
                      ) : (
                        "Autosave on"
                      )}
                    </span>
                  </div>
                </div>

                <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Export mission distribution</DialogTitle>
                      <DialogDescription>{client || "Client not specified"} · {title || "Untitled mission"}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pdf-mission-date">Date</Label>
                        <Input id="pdf-mission-date" type="date" value={pdfDate} onChange={(e) => setPdfDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pdf-mission-context">Context</Label>
                        <Textarea id="pdf-mission-context" value={pdfContext} onChange={(e) => setPdfContext(e.target.value)} placeholder="Mission context" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Human Resources Allocated</Label>
                        <p className="text-sm text-foreground">{people.join(", ") || "None"}</p>
                      </div>
                      <p className="font-mono text-sm tabular-nums">Budget: {fmt(Number(budget) || 0)} {currency}</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPdfOpen(false)}>Cancel</Button>
                      <Button onClick={downloadPdf}><FileDown className="mr-2 h-4 w-4" />Download PDF</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Card>
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Briefcase className="h-4 w-4 text-primary" /> Mission Setup
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Client, mission title, iteration and budget.</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label>Client</Label>
                      <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mission title</Label>
                      <MissionProductSelect products={products} value={productId} onSelect={selectProduct} loading={productsLoading} error={productError} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Number of iteration</Label>
                      <Input
                        aria-label="Number of iteration"
                        value={productId ? iteration : ""}
                        readOnly
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Budget</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                          className="flex-1"
                        />
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TND">TND</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI summary */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Budget</p>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{fmt(Number(budget) || 0)}</p>
                    <p className="text-[11px] text-muted-foreground">{currency}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total charges</p>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-b4-coral">{fmt(chargesTotal)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(Number(budget) || 0) > 0
                        ? `${(Math.round((chargesTotal / (Number(budget) || 1)) * 10000) / 100).toFixed(2)}% of budget`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pool to distribute</p>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-primary">{fmt(internalPool)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {people.length} {people.length > 1 ? "people" : "person"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tasks allocated</p>
                    <p
                      className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                        totalPercent === 100 ? "text-b4-teal" : "text-amber-600"
                      }`}
                    >
                      {totalPercent}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {totalPercent === 100 ? "Fully distributed" : "Must reach 100%"}
                    </p>
                  </div>
                </div>

                {/* Charges */}
                <Card>
                  <CardHeader className="flex flex-col gap-2 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex flex-1 cursor-pointer select-none items-start justify-between gap-2"
                      onClick={() => toggleSection("charges")}
                    >
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ClipboardList className="h-4 w-4 text-b4-coral" /> Entity core team
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Broker, Administration, Quality Assurance, Platform Fees and other entity charges deducted first.
                        </p>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed.charges ? "" : "rotate-180"}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start sm:self-auto"
                      onClick={() => setCharges((p) => [...p, { id: uid(), label: "New charge", amount: 0 }])}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add charge
                    </Button>
                  </CardHeader>
                  {!collapsed.charges && (
                  <CardContent>
                    <div className="-mx-6 overflow-x-auto px-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-28 text-right">%</TableHead>
                            <TableHead className="w-40 text-right">Amount</TableHead>
                            <TableHead className="w-16" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {charges.map((c) => {
                            const budgetNum = Number(budget) || 0;
                            const pct =
                              c.fixed && c.percent !== undefined && c.percent !== null
                                ? Number(c.percent)
                                : budgetNum > 0
                                  ? Math.round(((Number(c.amount) || 0) / budgetNum) * 10000) / 100
                                  : 0;
                            return (
                              <TableRow key={c.id}>
                                <TableCell>
                                  <Input
                                    value={c.label}
                                    readOnly={c.fixed}
                                    className={c.fixed ? "bg-muted/40 font-medium" : undefined}
                                    onChange={(e) => !c.fixed && updateCharge(c.id, { label: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      readOnly={c.system}
                                      title={c.system ? "Platform fee — set by the platform" : undefined}
                                      className={`pr-6 text-right ${c.system ? "bg-muted/40" : ""}`}
                                      value={pct}
                                      onChange={(e) => {
                                        if (c.system) return;
                                        const v = parseFloat(e.target.value);
                                        const nextPct = isNaN(v) ? 0 : v;
                                        updateCharge(c.id, {
                                          ...(c.fixed ? { percent: nextPct } : {}),
                                          amount: Math.round((nextPct / 100) * budgetNum * 100) / 100,
                                        });
                                      }}
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    className={`text-right ${c.system ? "bg-muted/40" : ""}`}
                                    value={c.amount}
                                    readOnly={c.system}
                                    onChange={(e) => {
                                      if (c.system) return;
                                      const amount = parseFloat(e.target.value) || 0;
                                      updateCharge(c.id, {
                                        amount,
                                        ...(c.fixed
                                          ? { percent: budgetNum > 0 ? Math.round((amount / budgetNum) * 10000) / 100 : 0 }
                                          : {}),
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {!c.fixed && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setCharges((p) => p.filter((x) => x.id !== c.id))}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/40 font-semibold">
                            <TableCell>Total entity core team</TableCell>
                            <TableCell className="text-right">
                              {(Number(budget) || 0) > 0
                                ? `${(Math.round((chargesTotal / (Number(budget) || 1)) * 10000) / 100).toFixed(2)}%`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">{fmt(chargesTotal)}</TableCell>
                            <TableCell />
                          </TableRow>
                          <TableRow className="font-semibold">
                            <TableCell>Remaining pool</TableCell>
                            <TableCell className="text-right">
                              {(Number(budget) || 0) > 0
                                ? `${(Math.round((internalPool / (Number(budget) || 1)) * 10000) / 100).toFixed(2)}%`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">{fmt(internalPool)}</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                  )}
                </Card>

                {/* People */}
                <Card>
                  <CardHeader className="flex flex-col gap-2 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex flex-1 cursor-pointer select-none items-start justify-between gap-2"
                      onClick={() => toggleSection("people")}
                    >
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Users className="h-4 w-4 text-b4-teal" /> People splitting the pool
                          <Badge variant="secondary">{people.length}</Badge>
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Each person receives a share of every task (in %).
                        </p>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed.people ? "" : "rotate-180"}`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPeople((p) => [...p, `Person (${p.length + 1})`])}>
                        <Plus className="mr-1 h-4 w-4" /> Add person
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPeople((p) => (p.length > 1 ? p.slice(0, -1) : p))}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove last
                      </Button>
                    </div>
                  </CardHeader>
                  {!collapsed.people && (
                  <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {people.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {(p || "?").trim().charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <Input
                            value={p}
                            onChange={(e) => setPeople((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                            className="h-8"
                          />
                          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {fmt(perPersonTotal[i] || 0)} {currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  )}
                </Card>

                {/* Tasks */}
                <Card>
                  <CardHeader className="flex flex-col gap-2 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex flex-1 cursor-pointer select-none items-start justify-between gap-2"
                      onClick={() => toggleSection("tasks")}
                    >
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ListChecks className="h-4 w-4 text-primary" /> Operation Task Force
                          <Badge variant={totalPercent === 100 ? "secondary" : "destructive"}>{totalPercent}%</Badge>
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pool of {fmt(opPool)} {currency} (remaining pool minus Reste Structure and Third Party Charges) split by task, then by person.
                        </p>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed.tasks ? "" : "rotate-180"}`}
                      />
                    </div>
                    <Button size="sm" variant="outline" className="self-start sm:self-auto" onClick={addTask}>
                      <Plus className="mr-1 h-4 w-4" /> Add task
                    </Button>
                  </CardHeader>
                  {!collapsed.tasks && (
                  <CardContent>
                    <div className="-mx-6 overflow-x-auto px-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead className="w-24 text-right">%</TableHead>
                            <TableHead className="w-32 text-right">Amount</TableHead>
                            {people.map((p, i) => (
                              <TableHead key={i} className="bg-foreground text-right text-background">
                                {p}
                              </TableHead>
                            ))}
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((t, idx) => (t.locked || t.thirdParty) ? null : (
                            <TableRow key={t.id}>
                              <TableCell>
                                {t.locked ? (
                                  <span className="text-sm font-medium">
                                    {t.label}
                                    <span className="ml-1 text-xs text-muted-foreground">(not split)</span>
                                  </span>
                                ) : (
                                  <Input value={t.label} onChange={(e) => updateTask(t.id, { label: e.target.value })} />
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="text-right"
                                  value={t.percent}
                                  onChange={(e) => updateTask(t.id, { percent: parseFloat(e.target.value) || 0 })}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">{fmt(taskAmounts[idx])}</TableCell>
                              {people.map((_, pi) => {
                                const val = perPersonPerTask[idx][pi];
                                if (val === null) {
                                  return (
                                    <TableCell key={pi} className="text-right text-muted-foreground">
                                      —
                                    </TableCell>
                                  );
                                }
                                const shares = getShares(t);
                                return (
                                  <TableCell key={pi} className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                        {fmt(val)}
                                      </span>
                                      <div className="relative w-20">
                                        <Input
                                          type="number"
                                          className="h-8 pr-5 text-right"
                                          value={Math.round(shares[pi] * 100) / 100}
                                          onChange={(e) => updateTaskShare(t.id, pi, parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                          %
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                {!t.locked && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-semibold">
                             <TableCell>Total</TableCell>
                            <TableCell className="text-right">{totalPercent}%</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmt(opPool)}</TableCell>
                            {people.map((_, pi) => (
                              <TableCell key={pi} className="text-right font-mono tabular-nums">
                                {fmt(perPersonTotal[pi] || 0)}
                              </TableCell>
                            ))}
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                  )}
                </Card>


                {/* Third Party Charges */}
                <Card>
                  <CardHeader className="flex flex-col gap-2 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex flex-1 cursor-pointer select-none items-start justify-between gap-2"
                      onClick={() => toggleSection("thirdParty")}
                    >
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wallet className="h-4 w-4 text-b4-teal" /> Third Party Charges
                          <Badge variant="secondary">{fmt(thirdPartyTotal)} {currency}</Badge>
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Fixed amounts paid to third parties, taken out of the pool before the task force split. The % is derived from the amount.
                        </p>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed.thirdParty ? "" : "rotate-180"}`}
                      />
                    </div>
                    <Button size="sm" variant="outline" className="self-start sm:self-auto" onClick={addThirdParty}>
                      <Plus className="mr-1 h-4 w-4" /> Add charge
                    </Button>
                  </CardHeader>
                  {!collapsed.thirdParty && (
                  <CardContent>
                    <div className="-mx-6 overflow-x-auto px-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Third party charge</TableHead>
                            <TableHead className="w-32 text-right">Amount</TableHead>
                            <TableHead className="w-24 text-right">%</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {thirdPartyTasks.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                No third party charges yet.
                              </TableCell>
                            </TableRow>
                          )}
                          {tasks.map((t, idx) => !t.thirdParty || t.locked ? null : (
                            <TableRow key={t.id}>
                              <TableCell>
                                <Input value={t.label} onChange={(e) => updateTask(t.id, { label: e.target.value })} />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="text-right"
                                  value={t.amount ?? 0}
                                  onChange={(e) => updateTask(t.id, { amount: parseFloat(e.target.value) || 0 })}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                {(Number(budget) || 0) > 0
                                  ? `${(Math.round(((Number(t.amount) || 0) / (Number(budget) || 1)) * 10000) / 100).toFixed(2)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {thirdPartyTasks.length > 0 && (
                            <TableRow className="border-t-2 font-semibold">
                              <TableCell>Total third party charges</TableCell>
                              <TableCell className="text-right font-mono tabular-nums">{fmt(thirdPartyTotal)}</TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {(Number(budget) || 0) > 0
                                  ? `${(Math.round((thirdPartyTotal / (Number(budget) || 1)) * 10000) / 100).toFixed(2)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                  )}
                </Card>

                {/* Reste Structure */}
                 <Card>
                  <CardHeader className="border-b border-border/60">
                    <div
                      className="flex cursor-pointer select-none items-start justify-between gap-2"
                      onClick={() => toggleSection("reserve")}
                    >
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ListChecks className="h-4 w-4 text-b4-coral" /> Reste Structure
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">Separate percentage of the full mission budget, kept by the entity and never split per person.</p>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed.reserve ? "" : "rotate-180"}`}
                      />
                    </div>
                  </CardHeader>
                  {!collapsed.reserve && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-24 text-right">%</TableHead>
                          <TableHead className="w-32 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((t, idx) => !t.locked ? null : (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.label}</TableCell>
                            <TableCell>
                              <Input type="number" className="text-right" value={t.percent}
                                onChange={(e) => updateTask(t.id, { percent: parseFloat(e.target.value) || 0 })} />
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{fmt(taskAmounts[idx])} {currency}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                  )}
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={totalPercent === 100 ? "secondary" : "destructive"}>Tasks {totalPercent}%</Badge>
                    <Badge variant="outline">
                      Pool {fmt(opPool)} {currency}
                    </Badge>
                  </div>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Save mission
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
}
