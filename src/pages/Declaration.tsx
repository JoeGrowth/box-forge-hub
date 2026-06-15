import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Wallet, Users, Building2, FlaskConical, CheckCircle2, Clock,
  TrendingUp, Settings, Briefcase, ArrowDownCircle,
  ArrowUpCircle, PiggyBank, UserPlus,
} from "lucide-react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Payee = { id: string; name: string; role?: string; amount: number; paid: boolean };
type DeliveryType = "consulting" | "training" | "fact-check";
type Currency = "TND" | "EUR" | "USD";
type Mission = {
  id: string;
  entity_id: string;
  client: string;
  type: DeliveryType;
  budget: number;
  currency: Currency;
  client_paid: boolean;
  internal: Payee[];
  external: Payee[];
  sort_order: number;
};
type Entity = { id: string; owner_id: string; name: string };
type Collaborator = { id: string; entity_id: string; collaborator_email: string; access: "view" | "edit" };

const DEFAULT_INTERNALS = ["Structure Handler", "Process Handler"];
const ROSTER_KEY = "declaration_internal_roster_v1";
const ACTIVE_ENTITY_KEY = "declaration_active_entity_v1";
const THRESHOLD = 1000;
const CURRENCIES: Currency[] = ["TND", "EUR", "USD"];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_META: Record<DeliveryType, { label: string; tone: string }> = {
  consulting: { label: "Consulting", tone: "bg-blue-500/10 text-blue-700 border-blue-200" },
  training: { label: "Training", tone: "bg-purple-500/10 text-purple-700 border-purple-200" },
  "fact-check": { label: "Fact Check", tone: "bg-amber-500/10 text-amber-700 border-amber-200" },
};

export default function Declaration() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [roster, setRoster] = useState<string[]>(DEFAULT_INTERNALS);
  const [newRosterName, setNewRosterName] = useState("");

  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collabEmail, setCollabEmail] = useState("");
  const [collabAccess, setCollabAccess] = useState<"view" | "edit">("edit");

  const activeEntity = entities.find((e) => e.id === activeEntityId);
  const isOwner = !!activeEntity && activeEntity.owner_id === user?.id;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load roster from localStorage
  useEffect(() => {
    try {
      const r = localStorage.getItem(ROSTER_KEY);
      if (r) setRoster(JSON.parse(r));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  }, [roster]);

  // Load entities
  const loadEntities = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("declaration_entities")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erreur chargement entités", description: error.message, variant: "destructive" });
      return;
    }
    setEntities((data || []) as Entity[]);
    const saved = localStorage.getItem(ACTIVE_ENTITY_KEY);
    const found = data?.find((e) => e.id === saved);
    setActiveEntityId(found?.id ?? data?.[0]?.id ?? null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadEntities().finally(() => setLoading(false));
  }, [user, loadEntities]);

  useEffect(() => {
    if (activeEntityId) localStorage.setItem(ACTIVE_ENTITY_KEY, activeEntityId);
  }, [activeEntityId]);

  // Load missions for active entity
  const loadMissions = useCallback(async (entityId: string) => {
    const { data, error } = await supabase
      .from("declaration_missions")
      .select("*")
      .eq("entity_id", entityId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Erreur chargement missions", description: error.message, variant: "destructive" });
      return;
    }
    const parsed: Mission[] = (data || []).map((m: any) => ({
      id: m.id,
      entity_id: m.entity_id,
      client: m.client,
      type: m.type as DeliveryType,
      budget: Number(m.budget),
      client_paid: m.client_paid,
      internal: Array.isArray(m.internal) ? m.internal : [],
      external: Array.isArray(m.external) ? m.external : [],
      sort_order: m.sort_order,
    }));
    setMissions(parsed);
    setActiveId(parsed[0]?.id ?? null);

    // One-time migration: if entity is empty and legacy localStorage missions exist, import them
    const MIGRATED_KEY = `declaration_migrated_${entityId}`;
    if (parsed.length === 0 && !localStorage.getItem(MIGRATED_KEY)) {
      try {
        const legacy = localStorage.getItem("declaration_missions_v2");
        if (legacy) {
          const arr = JSON.parse(legacy);
          const valid = Array.isArray(arr)
            ? arr.filter((m: any) => m && (m.client || m.budget || m.internal?.length || m.external?.length))
            : [];
          if (valid.length > 0) {
            const rows = valid.map((m: any, i: number) => ({
              entity_id: entityId,
              client: m.client || "",
              type: m.type || "consulting",
              budget: Number(m.budget) || 0,
              client_paid: !!m.client_paid,
              internal: Array.isArray(m.internal) ? m.internal : [],
              external: Array.isArray(m.external) ? m.external : [],
              sort_order: i,
            }));
            const { data: inserted, error: insErr } = await supabase
              .from("declaration_missions")
              .insert(rows)
              .select();
            if (!insErr && inserted) {
              const imported: Mission[] = inserted.map((m: any) => ({
                id: m.id,
                entity_id: m.entity_id,
                client: m.client,
                type: m.type as DeliveryType,
                budget: Number(m.budget),
                client_paid: m.client_paid,
                internal: Array.isArray(m.internal) ? m.internal : [],
                external: Array.isArray(m.external) ? m.external : [],
                sort_order: m.sort_order,
              }));
              setMissions(imported);
              setActiveId(imported[0]?.id ?? null);
              localStorage.setItem(MIGRATED_KEY, "1");
              toast({
                title: "Missions importées",
                description: `${imported.length} mission(s) importée(s) dans cette entité.`,
              });
            }
          } else {
            localStorage.setItem(MIGRATED_KEY, "1");
          }
        }
      } catch (e) {
        console.warn("Legacy mission import failed", e);
      }
    }
  }, []);

  useEffect(() => {
    if (activeEntityId) loadMissions(activeEntityId);
    else setMissions([]);
  }, [activeEntityId, loadMissions]);

  // Load collaborators when dialog opens
  useEffect(() => {
    if (!entityDialogOpen || !activeEntityId) return;
    supabase
      .from("declaration_entity_collaborators")
      .select("*")
      .eq("entity_id", activeEntityId)
      .then(({ data }) => setCollaborators((data || []) as Collaborator[]));
  }, [entityDialogOpen, activeEntityId]);

  // ---------- Entity actions ----------
  const createEntity = async () => {
    const name = newEntityName.trim();
    if (!name || !user) return;
    const { data, error } = await supabase
      .from("declaration_entities")
      .insert({ name, owner_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setEntities((es) => [...es, data as Entity]);
    setActiveEntityId(data.id);
    setNewEntityName("");
    toast({ title: "Entité créée", description: name });
  };

  const deleteEntity = async (id: string) => {
    if (!confirm("Supprimer cette entité et toutes ses missions ?")) return;
    const { error } = await supabase.from("declaration_entities").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setEntities((es) => es.filter((e) => e.id !== id));
    if (activeEntityId === id) setActiveEntityId(null);
  };

  const renameEntity = async (id: string, name: string) => {
    const { error } = await supabase.from("declaration_entities").update({ name }).eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setEntities((es) => es.map((e) => (e.id === id ? { ...e, name } : e)));
  };

  const addCollaborator = async () => {
    const email = collabEmail.trim().toLowerCase();
    if (!email || !activeEntityId) return;
    const { data, error } = await supabase
      .from("declaration_entity_collaborators")
      .insert({ entity_id: activeEntityId, collaborator_email: email, access: collabAccess })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setCollaborators((cs) => [...cs, data as Collaborator]);
    setCollabEmail("");
    toast({ title: "Collaborateur ajouté", description: email });

    // Send invitation email
    try {
      const { data: invRes, error: invErr } = await supabase.functions.invoke(
        "send-collaborator-invite",
        { body: { email, entityName: activeEntity?.name || "", access: collabAccess } }
      );
      if (invErr) throw invErr;
      toast({
        title: "Invitation envoyée",
        description: invRes?.isRegistered
          ? `${email} a accès à « ${activeEntity?.name || ""} »`
          : `${email} a été invité à créer un compte`,
      });
    } catch (e: any) {
      toast({
        title: "Email non envoyé",
        description: e?.message || "L'invitation par email a échoué.",
        variant: "destructive",
      });
    }
  };

  const removeCollaborator = async (id: string) => {
    const { error } = await supabase.from("declaration_entity_collaborators").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setCollaborators((cs) => cs.filter((c) => c.id !== id));
  };

  // ---------- Mission actions ----------
  const addMission = async () => {
    if (!activeEntityId) return;
    const sort_order = (missions[0]?.sort_order ?? 0) - 1;
    const { data, error } = await supabase
      .from("declaration_missions")
      .insert({
        entity_id: activeEntityId,
        client: "",
        type: "consulting",
        budget: 0,
        client_paid: false,
        internal: [],
        external: [],
        sort_order,
      })
      .select()
      .single();
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    const m: Mission = {
      id: data.id, entity_id: data.entity_id, client: "", type: "consulting",
      budget: 0, client_paid: false, internal: [], external: [], sort_order,
    };
    setMissions((ms) => [m, ...ms]);
    setActiveId(m.id);
  };

  const persistMission = async (id: string, patch: Partial<Mission>) => {
    const payload: any = { ...patch };
    if (payload.internal) payload.internal = payload.internal;
    await supabase.from("declaration_missions").update(payload).eq("id", id);
  };

  const update = (id: string, patch: Partial<Mission>) => {
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    persistMission(id, patch);
  };

  const updatePayees = (id: string, kind: "internal" | "external", payees: Payee[]) => {
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, [kind]: payees } : m)));
    supabase.from("declaration_missions").update({ [kind]: payees }).eq("id", id);
  };

  const addPayee = (id: string, kind: "internal" | "external") => {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    updatePayees(id, kind, [...m[kind], { id: uid(), name: "", amount: 0, paid: false }]);
  };
  const updatePayee = (id: string, kind: "internal" | "external", pid: string, patch: Partial<Payee>) => {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    updatePayees(id, kind, m[kind].map((p) => (p.id === pid ? { ...p, ...patch } : p)));
  };
  const removePayee = (id: string, kind: "internal" | "external", pid: string) => {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    updatePayees(id, kind, m[kind].filter((p) => p.id !== pid));
  };

  const removeMission = async (id: string) => {
    const { error } = await supabase.from("declaration_missions").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setMissions((ms) => {
      const next = ms.filter((m) => m.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  // ---------- Derivations ----------
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
      totalRest, distributable,
      pending: totalRest < THRESHOLD ? THRESHOLD - totalRest : 0,
      recognition, investment,
      associe1: recognition * 0.7, associe2: recognition * 0.3,
      infra: investment * 0.4, lab: investment * 0.6,
      reached: totalRest >= THRESHOLD,
    };
  }, [totals]);

  // Money Box: inflow = budget of missions where client_paid, outflow = paid payees
  const moneyBox = useMemo(() => {
    let inflow = 0, outflow = 0;
    const inflowItems: { label: string; amount: number }[] = [];
    const outflowItems: { label: string; amount: number }[] = [];
    missions.forEach((m) => {
      if (m.client_paid && m.budget > 0) {
        inflow += m.budget;
        inflowItems.push({ label: m.client || "Client", amount: m.budget });
      }
      [...m.internal, ...m.external].forEach((p) => {
        if (p.paid && p.amount > 0) {
          outflow += p.amount;
          outflowItems.push({ label: `${p.name || "—"} (${m.client || "mission"})`, amount: p.amount });
        }
      });
    });
    return { inflow, outflow, cash: inflow - outflow, inflowItems, outflowItems };
  }, [missions]);


  const activeMission = missions.find((m) => m.id === activeId);
  const activeIndex = missions.findIndex((m) => m.id === activeId);
  const activeTotal = totals[activeIndex];

  if (authLoading || loading) {
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

  // ----- Empty state: no entities -----
  if (entities.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Créez votre première entité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Chaque entité (ex : Pengry, Weimprove) regroupe ses propres missions, sa Money Box et ses collaborateurs.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'entité"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEntity()}
                />
                <Button onClick={createEntity}><Plus className="h-4 w-4 mr-1" /> Créer</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        {/* Header with entity selector */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <h1 className="text-3xl font-bold tracking-tight">Déclaration des Missions</h1>
            <p className="text-muted-foreground mt-1">
              Entité active · suivi des livraisons et de la trésorerie.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeEntityId ?? ""} onValueChange={setActiveEntityId}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Choisir une entité" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}{e.owner_id !== user.id ? " (partagée)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Gérer les entités">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Gérer les entités</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Create */}
                  <div>
                    <Label className="text-sm">Créer une entité</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        placeholder="Nom de l'entité (ex : Pengry)"
                        value={newEntityName}
                        onChange={(e) => setNewEntityName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createEntity()}
                      />
                      <Button onClick={createEntity}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                    </div>
                  </div>

                  {/* My entities */}
                  <div>
                    <Label className="text-sm">Mes entités</Label>
                    <div className="space-y-2 mt-1.5">
                      {entities.filter((e) => e.owner_id === user.id).map((e) => (
                        <div key={e.id} className="flex items-center gap-2 border rounded-md p-2">
                          <Input
                            value={e.name}
                            onChange={(ev) => setEntities((es) => es.map((x) => x.id === e.id ? { ...x, name: ev.target.value } : x))}
                            onBlur={(ev) => renameEntity(e.id, ev.target.value)}
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" onClick={() => deleteEntity(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collaborators of active entity */}
                  {isOwner && activeEntity && (
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <UserPlus className="h-4 w-4" /> Collaborateurs de « {activeEntity.name} »
                      </Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          placeholder="email@exemple.com"
                          value={collabEmail}
                          onChange={(e) => setCollabEmail(e.target.value)}
                        />
                        <Select value={collabAccess} onValueChange={(v) => setCollabAccess(v as any)}>
                          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Voir</SelectItem>
                            <SelectItem value="edit">Éditer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={addCollaborator}>Inviter</Button>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        {collaborators.map((c) => (
                          <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-1.5 text-sm">
                            <span>{c.collaborator_email}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{c.access === "edit" ? "Éditeur" : "Lecteur"}</Badge>
                              <Button variant="ghost" size="icon" onClick={() => removeCollaborator(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {collaborators.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Aucun collaborateur.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEntityDialogOpen(false)}>Fermer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={addMission} size="lg" disabled={!activeEntityId}>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle mission
            </Button>
          </div>
        </div>

        {/* Money Box */}
        <Card className="mb-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-5 w-5 text-emerald-600" /> Money Box · {activeEntity?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> Inflow (Paid by the client)
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{fmt(moneyBox.inflow)} <span className="text-xs font-normal text-muted-foreground">TND</span></div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUpCircle className="h-4 w-4 text-rose-600" /> Outflow (Team paid)
                </div>
                <div className="text-2xl font-bold text-rose-700 mt-1">{fmt(moneyBox.outflow)} <span className="text-xs font-normal text-muted-foreground">TND</span></div>
              </div>
              <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4 text-emerald-700" /> Caisse actuelle
                </div>
                <div className={`text-2xl font-bold mt-1 ${moneyBox.cash >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                  {fmt(moneyBox.cash)} <span className="text-xs font-normal text-muted-foreground">TND</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool dashboard */}
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
                    <button onClick={() => setRoster((r) => r.filter((x) => x !== n))} className="ml-1 hover:text-destructive" aria-label="remove">
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
              <Button variant="outline" onClick={addRoster}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Mission selector */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Missions · cliquez pour éditer · glissez pour réordonner
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {missions
              .map((m, idx) => ({ m, t: totals[idx], idx }))
              .filter(({ m }) => m.client.trim() !== "" || m.budget > 0 || m.internal.length > 0 || m.external.length > 0)
              .map(({ m, t }) => {
                const isActive = m.id === activeId;
                const isDragging = dragId === m.id;
                const isOver = dragOverId === m.id && dragId !== m.id;
                return (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(m.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverId !== m.id) setDragOverId(m.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverId === m.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!dragId || dragId === m.id) {
                        setDragId(null);
                        setDragOverId(null);
                        return;
                      }
                      setMissions((ms) => {
                        const from = ms.findIndex((x) => x.id === dragId);
                        const to = ms.findIndex((x) => x.id === m.id);
                        if (from < 0 || to < 0) return ms;
                        const next = [...ms];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        // Persist new sort_order to DB
                        next.forEach((item, i) => {
                          supabase.from("declaration_missions").update({ sort_order: i }).eq("id", item.id);
                        });
                        return next;
                      });
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onClick={() => setActiveId(m.id)}
                    className={`flex-shrink-0 text-left rounded-xl border p-4 min-w-[220px] max-w-[260px] transition-all hover:shadow-sm cursor-grab active:cursor-grabbing ${
                      isActive
                        ? "border-primary/60 bg-primary/[0.04] ring-1 ring-primary/20"
                        : "border-muted bg-card hover:border-primary/30"
                    } ${isDragging ? "opacity-40" : ""} ${isOver ? "ring-2 ring-primary/50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={TYPE_META[m.type].tone}>
                        {TYPE_META[m.type].label}
                      </Badge>
                      {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="font-semibold truncate">{m.client || "Mission sans nom"}</div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>Budget {fmt(m.budget)} TND</div>
                      <div>Reste {fmt(t?.rest ?? 0)} TND</div>
                      <div className="flex items-center gap-1">
                        {m.client_paid
                          ? <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid by the client</>
                          : <><Clock className="h-3 w-3 text-amber-600" /> Not Paid Yet</>}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Add new mission */}
            <button
              onClick={addMission}
              className="flex-shrink-0 flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 p-4 min-w-[80px] max-w-[80px] transition-all hover:border-primary/50 hover:bg-primary/[0.03]"
              title="Nouvelle mission"
            >
              <Plus className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Active mission detail */}
        {activeMission && activeTotal ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 space-y-0 pb-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[260px] grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs h-4 flex items-center mb-1">Client</Label>
                    <Input
                      placeholder="Nom du client"
                      value={activeMission.client}
                      onChange={(e) => update(activeMission.id, { client: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs h-4 flex items-center mb-1">Type de livraison</Label>
                    <Select
                      value={activeMission.type}
                      onValueChange={(v) => update(activeMission.id, { type: v as DeliveryType })}
                    >
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="fact-check">Fact Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs h-4 flex items-center gap-1 mb-1">
                      <Wallet className="h-3 w-3" /> Budget livraison (TND)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={activeMission.budget || ""}
                      onChange={(e) => update(activeMission.id, { budget: +e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeMission(activeMission.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <Badge variant="outline" className={TYPE_META[activeMission.type].tone}>
                  {TYPE_META[activeMission.type].label}
                </Badge>
                {activeMission.client && <Badge variant="secondary">{activeMission.client}</Badge>}
                <div className="ml-auto flex items-center gap-2 text-xs">
                  <Switch
                    id={`paid-client-${activeMission.id}`}
                    checked={activeMission.client_paid}
                    onCheckedChange={(v) => update(activeMission.id, { client_paid: v })}
                  />
                  <Label htmlFor={`paid-client-${activeMission.id}`} className="cursor-pointer flex items-center gap-1">
                    {activeMission.client_paid
                      ? <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid by the client</>
                      : <><Clock className="h-3 w-3 text-amber-600" /> Not Paid Yet</>}
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <PayeeSection
                title="Internes"
                subtitle="Membres de la structure"
                accent="primary"
                payees={activeMission.internal}
                total={activeTotal.intT}
                paid={activeTotal.intPaid}
                due={activeTotal.intDue}
                nameOptions={roster}
                onAdd={() => addPayee(activeMission.id, "internal")}
                onUpdate={(pid, patch) => updatePayee(activeMission.id, "internal", pid, patch)}
                onRemove={(pid) => removePayee(activeMission.id, "internal", pid)}
              />

              <PayeeSection
                title="Externes"
                subtitle="Prestataires hors structure"
                accent="muted"
                payees={activeMission.external}
                total={activeTotal.extT}
                paid={activeTotal.extPaid}
                due={activeTotal.extDue}
                onAdd={() => addPayee(activeMission.id, "external")}
                onUpdate={(pid, patch) => updatePayee(activeMission.id, "external", pid, patch)}
                onRemove={(pid) => removePayee(activeMission.id, "external", pid)}
              />

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Budget" value={activeMission.budget} />
                <Stat label="Internes" value={activeTotal.intT} />
                <Stat label="Externes" value={activeTotal.extT} />
                <Stat
                  label="Reste Structure"
                  value={activeTotal.rest}
                  highlight={activeTotal.rest >= 0 ? "positive" : "negative"}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            Aucune mission sélectionnée. Cliquez sur une mission ci-dessus ou ajoutez-en une nouvelle.
          </Card>
        )}
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

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: "positive" | "negative" }) {
  const tone =
    highlight === "positive" ? "border-emerald-500/40 bg-emerald-500/5"
    : highlight === "negative" ? "border-destructive/40 bg-destructive/5"
    : "bg-muted/20";
  return (
    <div className={`rounded-md border p-3 ${tone}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-lg">{fmt(value)} <span className="text-xs font-normal text-muted-foreground">TND</span></div>
    </div>
  );
}

function PayeeSection({
  title, subtitle, accent, payees, total, paid, due, nameOptions, onAdd, onUpdate, onRemove,
}: {
  title: string; subtitle: string; accent: "primary" | "muted";
  payees: Payee[]; total: number; paid: number; due: number;
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
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
      </div>

      {payees.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">Aucune personne ajoutée.</p>
      ) : (
        <div className="space-y-2">
          {payees.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-background rounded-md p-2 border">
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
                  <Input placeholder="Nom" value={p.name} onChange={(e) => onUpdate(p.id, { name: e.target.value })} />
                )}
              </div>
              <div className="col-span-7 md:col-span-3">
                <Input type="number" placeholder="Montant" value={p.amount || ""} onChange={(e) => onUpdate(p.id, { amount: +e.target.value })} />
              </div>
              <div className="col-span-4 md:col-span-3 flex items-center gap-2">
                <Switch checked={p.paid} onCheckedChange={(v) => onUpdate(p.id, { paid: v })} id={`paid-${p.id}`} />
                <Label htmlFor={`paid-${p.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                  {p.paid ? <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid</> : <><Clock className="h-3 w-3 text-amber-600" /> Pending</>}
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
          <div className="text-muted-foreground">Paid</div>
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
