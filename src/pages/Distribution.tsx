import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Briefcase, GraduationCap, CalendarDays, Save, RefreshCw, Loader2, Lock, FolderOpen, Eye, Pencil, Building2, Settings, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";



type Task = { id: string; label: string; percent: number; locked?: boolean };
type Charge = { id: string; label: string; amount: number };
type Kind = string;

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

function DistributionBuilder({
  kind,
  kindLabel,
  defaultTitle,
  defaultBudgetLabel,
  defaultTasks,
  defaultCharges,
}: {
  kind: Kind;
  kindLabel?: string;
  defaultTitle: string;
  defaultBudgetLabel: string;
  defaultTasks: Task[];
  defaultCharges: Charge[];
}) {
  const label = kindLabel ?? kind;
  const { user } = useAuth();
  const [resetKey, setResetKey] = useState(0);
  const [title, setTitle] = useState(defaultTitle);
  const [budget, setBudget] = useState<number>(420);
  const [budgetLabel, setBudgetLabel] = useState(defaultBudgetLabel);
  const [charges, setCharges] = useState<Charge[]>(defaultCharges);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [people, setPeople] = useState<string[]>(["Person (1)", "Person (2)"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data } = await (supabase.from("distribution_records" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: true });
    setSaved(data || []);
    setLoadingSaved(false);
  }, [user, kind]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const chargesTotal = useMemo(() => charges.reduce((s, c) => s + (Number(c.amount) || 0), 0), [charges]);
  const internalPool = Math.max(0, (Number(budget) || 0) - chargesTotal);
  const totalPercent = useMemo(() => tasks.reduce((s, t) => s + (Number(t.percent) || 0), 0), [tasks]);

  const taskAmounts = tasks.map((t) => (internalPool * (Number(t.percent) || 0)) / 100);
  const splittableTotal = tasks.reduce(
    (s, t, i) => (t.locked ? s : s + taskAmounts[i]),
    0,
  );
  const perPersonEqual = people.length > 0 ? splittableTotal / people.length : 0;
  const perPersonPerTask = tasks.map((t, i) =>
    t.locked || people.length === 0 ? null : taskAmounts[i] / people.length,
  );

  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updateCharge = (id: string, patch: Partial<Charge>) =>
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const resetForm = () => {
    setTitle(defaultTitle);
    setBudget(420);
    setBudgetLabel(defaultBudgetLabel);
    setCharges(defaultCharges.map((c) => ({ ...c, id: uid() })));
    setTasks(defaultTasks.map((t) => ({ ...t, id: uid() })));
    setPeople(["Person (1)", "Person (2)"]);
    setEditingId(null);
    setResetKey((k) => k + 1);
  };

  const loadSaved = (rec: any, mode: "view" | "edit" = "view") => {
    setTitle(rec.title);
    setBudget(Number(rec.budget) || 0);
    setBudgetLabel(rec.budget_label || defaultBudgetLabel);
    setCharges(Array.isArray(rec.charges) ? rec.charges : []);
    setTasks(Array.isArray(rec.tasks) ? rec.tasks : []);
    setPeople(Array.isArray(rec.people) && rec.people.length > 0 ? rec.people : ["Person (1)"]);
    setEditingId(mode === "edit" ? rec.id : null);
    setResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(
      mode === "edit"
        ? `Editing "${rec.title}" — changes will overwrite this record.`
        : `Loaded "${rec.title}" — save under a new title to keep changes.`,
    );
  };

  const deleteSaved = async (rec: any) => {
    if (!confirm(`Delete distribution "${rec.title}"?`)) return;
    const { error } = await (supabase.from("distribution_records" as any) as any).delete().eq("id", rec.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted.");
    fetchSaved();
  };

  const titleTaken = useMemo(
    () =>
      saved.some(
        (r) =>
          r.id !== editingId &&
          r.title.trim().toLowerCase() === title.trim().toLowerCase(),
      ),
    [saved, title, editingId],
  );

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save distributions.");
      return;
    }
    if (!title.trim()) {
      toast.error("Mission title is required.");
      return;
    }
    if (titleTaken) {
      toast.error(`A ${label} distribution called "${title}" already exists — pick a different title.`);
      return;
    }
    if (totalPercent !== 100) {
      toast.error(`Task percentages must total 100% (currently ${totalPercent}%).`);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      kind,
      title: title.trim(),
      budget_label: budgetLabel,
      budget,
      charges,
      tasks,
      people,
    };
    const { error } = editingId
      ? await (supabase.from("distribution_records" as any) as any)
          .update(payload)
          .eq("id", editingId)
      : await (supabase.from("distribution_records" as any) as any).insert(payload);
    setSaving(false);
    if (error) {
      if ((error as any).code === "23505") {
        toast.error(`A ${label} distribution called "${title}" already exists.`);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(editingId ? "Distribution updated." : "Distribution saved.");
    await fetchSaved();
    resetForm();
  };

  return (
    <div className="space-y-6" key={resetKey}>
      {/* Saved distributions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Saved {label} distributions
            <Badge variant="secondary" className="ml-1">{saved.length}</Badge>
          </CardTitle>
          {loadingSaved && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved distributions yet. Fill the form below and click <strong>Save distribution</strong>.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">People</TableHead>
                  <TableHead>Saved</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saved.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-muted-foreground">({i + 1})</TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(r.budget))}</TableCell>
                    <TableCell className="text-right">{Array.isArray(r.people) ? r.people.length : 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => loadSaved(r, "view")} title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => loadSaved(r, "edit")} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSaved(r)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mission Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Mission title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={titleTaken ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {titleTaken && (
              <p className="text-xs text-destructive">
                A {label} distribution with this title already exists.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{budgetLabel}</Label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Budget label</Label>
            <Input value={budgetLabel} onChange={(e) => setBudgetLabel(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Charges</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCharges((p) => [...p, { id: uid(), label: "New charge", amount: 0 }])}
          >
            <Plus className="w-4 h-4 mr-1" /> Add charge
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-40 text-right">Amount</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Input value={c.label} onChange={(e) => updateCharge(c.id, { label: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right"
                      value={c.amount}
                      onChange={(e) => updateCharge(c.id, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCharges((p) => p.filter((x) => x.id !== c.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/40">
                <TableCell>Total charges</TableCell>
                <TableCell className="text-right">{fmt(chargesTotal)}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Infra &amp; Structure (Budget − Charges)</TableCell>
                <TableCell className="text-right">{fmt(internalPool)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">People splitting the pool</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPeople((p) => [...p, `Person (${p.length + 1})`])}
            >
              <Plus className="w-4 h-4 mr-1" /> Add person
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPeople((p) => (p.length > 1 ? p.slice(0, -1) : p))}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Remove last
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {people.map((p, i) => (
            <Input
              key={i}
              value={p}
              onChange={(e) =>
                setPeople((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              className="w-48"
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Internal &amp; Structure — task distribution</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setTasks((p) => {
                // Insert new task before the locked "rest structure" row if present
                const lockedIdx = p.findIndex((t) => t.locked);
                const newTask: Task = { id: uid(), label: "New task", percent: 0 };
                if (lockedIdx === -1) return [...p, newTask];
                const copy = [...p];
                copy.splice(lockedIdx, 0, newTask);
                return copy;
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" /> Add task
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead className="w-24 text-right">%</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
                {people.map((p, i) => (
                  <TableHead key={i} className="text-right bg-foreground text-background">
                    {p}
                  </TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t, idx) => (
                <TableRow key={t.id} className={t.locked ? "bg-muted/30" : ""}>
                  <TableCell>
                    {t.locked ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        {t.label}
                        <span className="text-xs text-muted-foreground ml-1">(not split)</span>
                      </div>
                    ) : (
                      <Input
                        value={t.label}
                        onChange={(e) => updateTask(t.id, { label: e.target.value })}
                      />
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
                  <TableCell className="text-right font-mono">{fmt(taskAmounts[idx])}</TableCell>
                  {people.map((_, pi) => (
                    <TableCell key={pi} className="text-right font-mono">
                      {perPersonPerTask[idx] === null ? "—" : fmt(perPersonPerTask[idx] as number)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {!t.locked && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totalPercent}%</TableCell>
                <TableCell className="text-right">{fmt(taskAmounts.reduce((s, a) => s + a, 0))}</TableCell>
                {people.map((_, i) => (
                  <TableCell key={i} className="text-right bg-foreground text-background">
                    {fmt(perPersonEqual)}
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          {totalPercent !== 100 && (
            <p className="text-xs text-amber-600 mt-3">
              Task percentages sum to {totalPercent}% — adjust to reach 100% for a full distribution.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 justify-end sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-xl border border-border">
        {editingId && (
          <Badge variant="outline" className="mr-auto">
            <Pencil className="w-3 h-3 mr-1" /> Editing existing distribution
          </Badge>
        )}
        <Button variant="outline" onClick={resetForm} disabled={saving}>
          <RefreshCw className="w-4 h-4 mr-1" /> {editingId ? "Cancel edit" : "Start new distribution"}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {editingId ? "Update distribution" : "Save distribution"}
        </Button>
      </div>
    </div>
  );
}

const consultingDefaults = {
  tasks: [
    { id: uid(), label: "Scoping & proposal", percent: 15 },
    { id: uid(), label: "Client discovery", percent: 15 },
    { id: uid(), label: "Delivery / execution", percent: 40 },
    { id: uid(), label: "Reporting & handover", percent: 15 },
    { id: uid(), label: "Follow-up & admin", percent: 10 },
    { id: uid(), label: "Rest Structure Consulting", percent: 5, locked: true },
  ] as Task[],
  charges: [
    { id: uid(), label: "Tools & software", amount: 40 },
    { id: uid(), label: "Travel", amount: 60 },
    { id: uid(), label: "Materials", amount: 0 },
  ] as Charge[],
};

const trainingDefaults = {
  tasks: [
    { id: uid(), label: "Curriculum design", percent: 20 },
    { id: uid(), label: "Slides & materials", percent: 15 },
    { id: uid(), label: "Live delivery", percent: 30 },
    { id: uid(), label: "Assessment & feedback", percent: 15 },
    { id: uid(), label: "Communication & promo", percent: 10 },
    { id: uid(), label: "Rest Structure Training", percent: 10, locked: true },
  ] as Task[],
  charges: [
    { id: uid(), label: "Room / platform", amount: 70 },
    { id: uid(), label: "Handouts", amount: 30 },
    { id: uid(), label: "Trainer expenses", amount: 0 },
  ] as Charge[],
};

const eventDefaults = {
  tasks: [
    { id: uid(), label: "Créer le formulaire et la publication instagram", percent: 20 },
    { id: uid(), label: "Les courses", percent: 10 },
    { id: uid(), label: "Mise en place de l'atelier", percent: 10 },
    { id: uid(), label: "Accompagnement des participants", percent: 20 },
    { id: uid(), label: "Nettoyage post évent", percent: 10 },
    { id: uid(), label: "Montage Reel insta", percent: 10 },
    { id: uid(), label: "Mail de remerciement", percent: 10 },
    { id: uid(), label: "Rest Structure Event", percent: 10, locked: true },
  ] as Task[],
  charges: [
    { id: uid(), label: "Matériels & matériaux", amount: 80 },
    { id: uid(), label: "Espace", amount: 70 },
    { id: uid(), label: "Artiste (…)", amount: 0 },
  ] as Charge[],
};

const DIST_ENTITIES_KEY = "distribution_entities_v1";
const DIST_ACTIVE_ENTITY_KEY = "distribution_active_entity_v1";
type DistEntity = { id: string; name: string };

export default function Distribution() {
  const [entities, setEntities] = useState<DistEntity[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DIST_ENTITIES_KEY);
      const list: DistEntity[] = raw ? JSON.parse(raw) : [];
      setEntities(list);
      const saved = localStorage.getItem(DIST_ACTIVE_ENTITY_KEY);
      setActiveEntityId(list.find((e) => e.id === saved)?.id ?? list[0]?.id ?? null);
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(DIST_ENTITIES_KEY, JSON.stringify(entities)); }, [entities]);
  useEffect(() => {
    if (activeEntityId) localStorage.setItem(DIST_ACTIVE_ENTITY_KEY, activeEntityId);
  }, [activeEntityId]);

  const addEntity = () => {
    const name = newEntityName.trim();
    if (!name) return;
    const ent: DistEntity = { id: uid(), name };
    setEntities((p) => [...p, ent]);
    setActiveEntityId(ent.id);
    setNewEntityName("");
  };
  const renameEntity = (id: string, name: string) =>
    setEntities((p) => p.map((e) => (e.id === id ? { ...e, name } : e)));
  const deleteEntity = (id: string) => {
    setEntities((p) => p.filter((e) => e.id !== id));
    if (activeEntityId === id) setActiveEntityId(null);
  };

  const activeEntity = entities.find((e) => e.id === activeEntityId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header — matches Déclaration des Missions style */}
            <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Distribution des Missions
                </h1>
                <p className="text-muted-foreground mt-1">
                  {activeEntity
                    ? <>Entité active · <strong className="text-foreground">{activeEntity.name}</strong> · répartition budgétaire par mission, formation ou événement.</>
                    : <>Choisir une entité pour organiser les répartitions budgétaires.</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={activeEntityId ?? ""} onValueChange={setActiveEntityId}>
                  <SelectTrigger className="w-[240px]">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Choisir une entité" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                    {entities.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune entité — ajoutez-en une via l'engrenage.</div>
                    )}
                  </SelectContent>
                </Select>
                <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title="Gérer les entités">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Gérer les entités</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm">Créer une entité</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            placeholder="Nom de l'entité"
                            value={newEntityName}
                            onChange={(e) => setNewEntityName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addEntity()}
                          />
                          <Button onClick={addEntity}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Mes entités</Label>
                        <div className="space-y-2 mt-1.5">
                          {entities.map((e) => (
                            <div key={e.id} className="flex items-center gap-2 border rounded-md p-2">
                              <Input
                                value={e.name}
                                onChange={(ev) => renameEntity(e.id, ev.target.value)}
                                className="flex-1"
                              />
                              <Button variant="ghost" size="icon" onClick={() => deleteEntity(e.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {entities.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Aucune entité.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>




            {!activeEntity ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Sélectionne ou crée une entité pour commencer à distribuer des budgets.
                </CardContent>
              </Card>
            ) : (
              <EntityCategories entityId={activeEntity.id} entityName={activeEntity.name} />
            )}

          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

// ─── Per-entity dynamic categories ─────────────────────────────────────────
type Category = { id: string; name: string };
const CATS_KEY = (entityId: string) => `distribution_categories_${entityId}`;
const ACTIVE_CAT_KEY = (entityId: string) => `distribution_active_category_${entityId}`;

const genericTasks = (): Task[] => [
  { id: uid(), label: "Preparation", percent: 30 },
  { id: uid(), label: "Delivery", percent: 50 },
  { id: uid(), label: "Follow-up", percent: 15 },
  { id: uid(), label: "Rest Structure", percent: 5, locked: true },
];
const genericCharges = (): Charge[] => [
  { id: uid(), label: "Materials", amount: 0 },
];

export function EntityCategories({
  scopeId,
  scopeLabel,
  defaults,
}: {
  scopeId: string;
  scopeLabel: string;
  defaults?: string[];
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATS_KEY(scopeId));
      let list: Category[] = raw ? JSON.parse(raw) : [];
      if (list.length === 0 && defaults && defaults.length) {
        list = defaults.map((n) => ({ id: uid(), name: n }));
        localStorage.setItem(CATS_KEY(scopeId), JSON.stringify(list));
      }
      setCats(list);
      const saved = localStorage.getItem(ACTIVE_CAT_KEY(scopeId));
      setActiveCatId(list.find((c) => c.id === saved)?.id ?? list[0]?.id ?? null);
    } catch {
      setCats([]);
      setActiveCatId(null);
    }
    setInitialised(true);
  }, [scopeId, defaults]);

  useEffect(() => {
    if (initialised) localStorage.setItem(CATS_KEY(scopeId), JSON.stringify(cats));
  }, [cats, scopeId, initialised]);
  useEffect(() => {
    if (activeCatId) localStorage.setItem(ACTIVE_CAT_KEY(scopeId), activeCatId);
  }, [activeCatId, scopeId]);

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    const cat: Category = { id: uid(), name };
    setCats((p) => [...p, cat]);
    setActiveCatId(cat.id);
    setNewName("");
    setAddOpen(false);
  };
  const deleteCategory = (id: string) => {
    if (!confirm("Delete this category? Saved distributions in it stay in the database.")) return;
    setCats((p) => p.filter((c) => c.id !== id));
    if (activeCatId === id) setActiveCatId(null);
  };
  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) setCats((p) => p.map((c) => (c.id === renamingId ? { ...c, name } : c)));
    setRenamingId(null);
    setRenameValue("");
  };

  const active = cats.find((c) => c.id === activeCatId);

  if (cats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">First category for {scopeLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Name the first type of distribution (e.g. <em>Event</em>, <em>Consulting</em>, <em>Formation</em>…).
          </p>
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory} disabled={!newName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md bg-muted p-1">
          {cats.map((c) => {
            const isActive = activeCatId === c.id;
            const isRenaming = renamingId === c.id;
            return (
              <div
                key={c.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-sm font-medium transition ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {isRenaming ? (
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                    }}
                    className="h-7 py-0 px-2 w-40"
                  />
                ) : (
                  <button
                    onClick={() => {
                      if (isActive) { setRenamingId(c.id); setRenameValue(c.name); }
                      else setActiveCatId(c.id);
                    }}
                    className={isActive ? "cursor-text" : "hover:text-foreground"}
                    title={isActive ? "Click to rename" : "Open category"}
                  >
                    {c.name}
                  </button>
                )}
                {isActive && !isRenaming && (
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="Delete category"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8" title="Add category" aria-label="Add category">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="e.g. Event, Consulting, Formation…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button onClick={addCategory} disabled={!newName.trim()}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {active && (
        <DistributionBuilder
          key={`${entityId}:${active.id}`}
          kind={`${entityId}:${active.id}`}
          kindLabel={active.name}
          defaultTitle={`${active.name} (1)`}
          defaultBudgetLabel="Budget"
          defaultTasks={genericTasks()}
          defaultCharges={genericCharges()}
        />
      )}
    </div>
  );
}

