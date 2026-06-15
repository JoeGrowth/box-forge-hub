import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Wallet, Users, Building2, FlaskConical, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";

type Payee = { id: string; name: string; role?: string; amount: number; paid: boolean };
type DeliveryType = "consulting" | "training" | "fact-check";
type Mission = {
  id: string;
  client: string;
  type: DeliveryType;
  budget: number;
  internal: Payee[];
  external: Payee[];
  createdAt: number;
};

const DEFAULT_INTERNALS = ["Structure Handler", "Process Handler"];
const STORAGE_KEY = "declaration_missions_v2";
const ROSTER_KEY = "declaration_internal_roster_v1";
const THRESHOLD = 1000; // TND

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const newMission = (): Mission => ({
  id: uid(),
  client: "",
  type: "consulting",
  budget: 0,
  internal: [],
  external: [],
  createdAt: Date.now(),
});

const TYPE_META: Record<DeliveryType, { label: string; tone: string }> = {
  consulting: { label: "Consulting", tone: "bg-blue-500/10 text-blue-700 border-blue-200" },
  training: { label: "Training", tone: "bg-purple-500/10 text-purple-700 border-purple-200" },
  "fact-check": { label: "Fact Check", tone: "bg-amber-500/10 text-amber-700 border-amber-200" },
};

export default function Declaration() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [roster, setRoster] = useState<string[]>(DEFAULT_INTERNALS);
  const [newRosterName, setNewRosterName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setMissions(raw ? JSON.parse(raw) : [newMission()]);
    } catch {
      setMissions([newMission()]);
    }
    try {
      const r = localStorage.getItem(ROSTER_KEY);
      if (r) setRoster(JSON.parse(r));
    } catch {}
  }, []);

  useEffect(() => {
    if (missions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
  }, [missions]);
  useEffect(() => {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  }, [roster]);

  const update = (id: string, patch: Partial<Mission>) =>
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const addPayee = (id: string, kind: "internal" | "external") =>
    setMissions((ms) =>
      ms.map((m) =>
        m.id === id
          ? { ...m, [kind]: [...m[kind], { id: uid(), name: "", amount: 0, paid: false }] }
          : m,
      ),
    );

  const updatePayee = (id: string, kind: "internal" | "external", pid: string, patch: Partial<Payee>) =>
    setMissions((ms) =>
      ms.map((m) =>
        m.id === id
          ? { ...m, [kind]: m[kind].map((p) => (p.id === pid ? { ...p, ...patch } : p)) }
          : m,
      ),
    );

  const removePayee = (id: string, kind: "internal" | "external", pid: string) =>
    setMissions((ms) =>
      ms.map((m) => (m.id === id ? { ...m, [kind]: m[kind].filter((p) => p.id !== pid) } : m)),
    );

  const removeMission = (id: string) => setMissions((ms) => ms.filter((m) => m.id !== id));

  const totals = useMemo(
    () =>
      missions.map((m) => {
        const intT = m.internal.reduce((s, p) => s + (+p.amount || 0), 0);
        const intPaid = m.internal.filter((p) => p.paid).reduce((s, p) => s + (+p.amount || 0), 0);
        const extT = m.external.reduce((s, p) => s + (+p.amount || 0), 0);
        const extPaid = m.external.filter((p) => p.paid).reduce((s, p) => s + (+p.amount || 0), 0);
        const rest = (+m.budget || 0) - intT - extT;
        return { intT, intPaid, intDue: intT - intPaid, extT, extPaid, extDue: extT - extPaid, rest };
      }),
    [missions],
  );

  const pool = useMemo(() => {
    const totalRest = totals.reduce((s, t) => s + Math.max(0, t.rest), 0);
    const distributable = totalRest >= THRESHOLD ? totalRest : 0;
    const recognition = distributable * 0.3;
    const investment = distributable * 0.7;
    return {
      totalRest,
      distributable,
      pending: totalRest < THRESHOLD ? THRESHOLD - totalRest : 0,
      recognition,
      investment,
      associe1: recognition * 0.7,
      associe2: recognition * 0.3,
      infra: investment * 0.4,
      lab: investment * 0.6,
      reached: totalRest >= THRESHOLD,
    };
  }, [totals]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-12 w-72 rounded-lg mb-8" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }
  if (!user) return null;

  const addRoster = () => {
    const n = newRosterName.trim();
    if (!n || roster.includes(n)) return;
    setRoster((r) => [...r, n]);
    setNewRosterName("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Déclaration des Missions</h1>
            <p className="text-muted-foreground mt-1">
              Suivi des livraisons par compte ouvert · Répartition automatique au-delà de {fmt(THRESHOLD)} TND.
            </p>
          </div>
          <Button onClick={() => setMissions((m) => [newMission(), ...m])} size="lg">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle mission
          </Button>
        </div>

        {/* Pool dashboard — visible only once cumulative Rest reaches threshold */}
        {pool.reached ? (
          <Card className="mb-8 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Pool Structure
                </CardTitle>
                <Badge className="text-xs">Seuil atteint · répartition active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Cumul Reste Structure : <strong className="text-foreground">{fmt(pool.totalRest)} TND</strong>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Users className="h-4 w-4 text-primary" /> Recognition · 30%
                    </div>
                    <span className="font-bold">{fmt(pool.recognition)} TND</span>
                  </div>
                  <div className="space-y-1.5 text-sm pl-2 border-l-2 border-primary/40">
                    <Row label="Associé 1 (70%)" value={pool.associe1} />
                    <Row label="Associé 2 (30%)" value={pool.associe2} />
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4 text-primary" /> Investment · 70%
                    </div>
                    <span className="font-bold">{fmt(pool.investment)} TND</span>
                  </div>
                  <div className="space-y-1.5 text-sm pl-2 border-l-2 border-primary/40">
                    <Row label="Infra (40%)" value={pool.infra} icon={<Building2 className="h-3 w-3" />} />
                    <Row label="Lab (60%)" value={pool.lab} icon={<FlaskConical className="h-3 w-3" />} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-dashed">
            <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">Cumul Reste Structure : </span>
                <strong>{fmt(pool.totalRest)} TND</strong>
                <span className="text-muted-foreground"> / {fmt(THRESHOLD)} TND</span>
              </div>
              <div className="flex-1 min-w-[180px] max-w-md">
                <Progress value={Math.min(100, (pool.totalRest / THRESHOLD) * 100)} className="h-2" />
              </div>
              <Badge variant="secondary" className="text-xs">
                Pool masqué · reste {fmt(pool.pending)} TND
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Internal roster manager */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Équipe interne (réutilisée sur toutes les missions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {roster.map((n, i) => (
                <Badge key={n} variant="secondary" className="gap-1 py-1.5 px-3">
                  <span className="text-xs text-muted-foreground">Internal {i + 1} —</span> {n}
                  {!DEFAULT_INTERNALS.includes(n) && (
                    <button
                      onClick={() => setRoster((r) => r.filter((x) => x !== n))}
                      className="ml-1 hover:text-destructive"
                      aria-label="remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un membre interne…"
                value={newRosterName}
                onChange={(e) => setNewRosterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoster()}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={addRoster}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Missions list */}
        <div className="space-y-6">
          {missions.map((m, idx) => {
            const t = totals[idx];
            const restPositive = t.rest >= 0;
            return (
              <Card key={m.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 space-y-0 pb-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[260px] grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Client</Label>
                        <Input
                          placeholder="Nom du client"
                          value={m.client}
                          onChange={(e) => update(m.id, { client: e.target.value })}
                          className="bg-background"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type de livraison</Label>
                        <Select value={m.type} onValueChange={(v) => update(m.id, { type: v as DeliveryType })}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consulting">Consulting</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="fact-check">Fact Check</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Wallet className="h-3 w-3" /> Budget livraison (TND)
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={m.budget || ""}
                          onChange={(e) => update(m.id, { budget: +e.target.value })}
                          className="bg-background"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMission(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className={TYPE_META[m.type].tone}>
                      {TYPE_META[m.type].label}
                    </Badge>
                    {m.client && <Badge variant="secondary">{m.client}</Badge>}
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Internal */}
                  <PayeeSection
                    title="Internes"
                    subtitle="Membres de la structure"
                    accent="primary"
                    payees={m.internal}
                    total={t.intT}
                    paid={t.intPaid}
                    due={t.intDue}
                    nameOptions={roster}
                    onAdd={() => addPayee(m.id, "internal")}
                    onUpdate={(pid, patch) => updatePayee(m.id, "internal", pid, patch)}
                    onRemove={(pid) => removePayee(m.id, "internal", pid)}
                  />

                  {/* External */}
                  <PayeeSection
                    title="Externes"
                    subtitle="Prestataires hors structure"
                    accent="muted"
                    payees={m.external}
                    total={t.extT}
                    paid={t.extPaid}
                    due={t.extDue}
                    onAdd={() => addPayee(m.id, "external")}
                    onUpdate={(pid, patch) => updatePayee(m.id, "external", pid, patch)}
                    onRemove={(pid) => removePayee(m.id, "external", pid)}
                  />

                  <Separator />

                  {/* Mission summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Budget" value={m.budget} />
                    <Stat label="Internes" value={t.intT} />
                    <Stat label="Externes" value={t.extT} />
                    <Stat
                      label="Reste Structure"
                      value={t.rest}
                      highlight={restPositive ? "positive" : "negative"}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className="font-medium">{fmt(value)} TND</span>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "positive" | "negative";
}) {
  const tone =
    highlight === "positive"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : highlight === "negative"
      ? "border-destructive/40 bg-destructive/5"
      : "bg-muted/20";
  return (
    <div className={`rounded-md border p-3 ${tone}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-lg">{fmt(value)} <span className="text-xs font-normal text-muted-foreground">TND</span></div>
    </div>
  );
}

function PayeeSection({
  title,
  subtitle,
  accent,
  payees,
  total,
  paid,
  due,
  nameOptions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  subtitle: string;
  accent: "primary" | "muted";
  payees: Payee[];
  total: number;
  paid: number;
  due: number;
  nameOptions?: string[];
  onAdd: () => void;
  onUpdate: (pid: string, patch: Partial<Payee>) => void;
  onRemove: (pid: string) => void;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent === "primary" ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter
        </Button>
      </div>

      {payees.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">Aucune personne ajoutée.</p>
      ) : (
        <div className="space-y-2">
          {payees.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-2 items-center bg-background rounded-md p-2 border"
            >
              <div className="col-span-12 md:col-span-5">
                {nameOptions ? (
                  <Select value={p.name} onValueChange={(v) => onUpdate(p.id, { name: v })}>
                    <SelectTrigger><SelectValue placeholder="Membre interne" /></SelectTrigger>
                    <SelectContent>
                      {nameOptions.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Nom"
                    value={p.name}
                    onChange={(e) => onUpdate(p.id, { name: e.target.value })}
                  />
                )}
              </div>
              <div className="col-span-7 md:col-span-3">
                <Input
                  type="number"
                  placeholder="Montant"
                  value={p.amount || ""}
                  onChange={(e) => onUpdate(p.id, { amount: +e.target.value })}
                />
              </div>
              <div className="col-span-4 md:col-span-3 flex items-center gap-2">
                <Switch
                  checked={p.paid}
                  onCheckedChange={(v) => onUpdate(p.id, { paid: v })}
                  id={`paid-${p.id}`}
                />
                <Label htmlFor={`paid-${p.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                  {p.paid ? (
                    <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payé</>
                  ) : (
                    <><Clock className="h-3 w-3 text-amber-600" /> En attente</>
                  )}
                </Label>
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => onRemove(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div className="rounded bg-muted/40 px-2 py-1.5">
          <div className="text-muted-foreground">Total</div>
          <div className="font-semibold">{fmt(total)} TND</div>
        </div>
        <div className="rounded bg-emerald-500/10 px-2 py-1.5">
          <div className="text-muted-foreground">Payé</div>
          <div className="font-semibold text-emerald-700">{fmt(paid)} TND</div>
        </div>
        <div className="rounded bg-amber-500/10 px-2 py-1.5">
          <div className="text-muted-foreground">À payer</div>
          <div className="font-semibold text-amber-700">{fmt(due)} TND</div>
        </div>
      </div>
    </div>
  );
}
