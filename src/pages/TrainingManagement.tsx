import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, FilePlus, FolderOpen, Share2, Loader2, Users, Briefcase, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DeliveryRow {
  id: string;
  label: string;
  percent: number;
}

interface TrainingPlan {
  id: string;
  owner_id: string;
  name: string;
  service_name: string;
  client_name: string | null;
  mission_sold_at: number;
  broker_pct: number;
  charge_mission: number;
  rows: DeliveryRow[];
  updated_at: string;
  created_at?: string;
}

interface ShareRow {
  id: string;
  shared_with_email: string;
}

const DEFAULT_DELIVERY: DeliveryRow[] = [
  { id: "1", label: "Deep Research", percent: 15 },
  { id: "2", label: "Prepare Content [Inputs] in google slides + Iterate", percent: 10 },
  { id: "3", label: "Prepare Exercises [Practice Inputs] + Iterate", percent: 10 },
  { id: "4", label: "Session Structuring in google slides [Set up the scene + Inputs + Practice Inputs]", percent: 10 },
  { id: "5", label: "Layout & Formatting", percent: 10 },
  { id: "6", label: "Workshop Delivery (6 hours)", percent: 30 },
  { id: "7", label: "Report", percent: 5 },
  { id: "8", label: "Rest for the structure [Process Handler]", percent: 10 },
];

const fmt = (n: number) =>
  isNaN(n) ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function TrainingManagement() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeService, setActiveService] = useState<string>("");

  const [shares, setShares] = useState<ShareRow[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");

  const current = plans.find((p) => p.id === currentId);
  const isOwner = !!current && !!user && current.owner_id === user.id;

  // Unique services from plans
  const services = Array.from(new Set(plans.map((p) => p.service_name || "General")));
  const visibleService = activeService || services[0] || "";
  const clientsForService = plans
    .filter((p) => (p.service_name || "General") === visibleService)
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));

  // Delivery occurrence number for current plan within its service
  const deliveryNumber = (() => {
    if (!current) return 1;
    const sameService = plans
      .filter((p) => (p.service_name || "General") === (current.service_name || "General"))
      .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    return sameService.findIndex((p) => p.id === current.id) + 1;
  })();
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Load plans
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) {
        toast.error("Failed to load plans");
      } else {
        const normalized = (data || []).map((p: any) => ({
          ...p,
          rows: Array.isArray(p.rows) ? p.rows : [],
        })) as TrainingPlan[];
        setPlans(normalized);
        if (normalized.length && !currentId) setCurrentId(normalized[0].id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load shares for current plan
  useEffect(() => {
    if (!current) {
      setShares([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("training_plan_shares")
        .select("id, shared_with_email")
        .eq("plan_id", current.id);
      setShares(data || []);
    })();
  }, [current?.id]);

  const updateCurrent = (patch: Partial<TrainingPlan>) => {
    setPlans((ps) => ps.map((p) => (p.id === currentId ? { ...p, ...patch } : p)));
  };

  const createNew = async (serviceName?: string) => {
    if (!user) return;
    const svc = serviceName || visibleService || "General";
    const { data, error } = await supabase
      .from("training_plans")
      .insert([{
        owner_id: user.id,
        name: "New Client",
        service_name: svc,
        client_name: "New Client",
        mission_sold_at: 3450,
        broker_pct: 5,
        charge_mission: 0,
        rows: DEFAULT_DELIVERY as any,
      }])
      .select()
      .single();
    if (error) {
      toast.error("Could not create client");
      return;
    }
    const p = { ...data, rows: data.rows as unknown as DeliveryRow[] } as TrainingPlan;
    setPlans((ps) => [p, ...ps]);
    setCurrentId(p.id);
    setActiveService(svc);
    toast.success("New client added");
  };

  const createService = async () => {
    const name = newServiceName.trim();
    if (!name) return;
    setNewServiceName("");
    setServiceDialogOpen(false);
    await createNew(name);
  };

  const persist = async () => {
    if (!current) return;
    setSaving(true);
    const { error } = await supabase
      .from("training_plans")
      .update({
        name: current.client_name || current.name,
        client_name: current.client_name,
        service_name: current.service_name,
        mission_sold_at: current.mission_sold_at,
        broker_pct: current.broker_pct,
        charge_mission: current.charge_mission,
        rows: current.rows as any,
      })
      .eq("id", current.id);
    setSaving(false);
    if (error) toast.error("Save failed");
    else toast.success("Saved");
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("training_plans").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    setPlans((ps) => {
      const next = ps.filter((p) => p.id !== id);
      if (id === currentId) setCurrentId(next[0]?.id || "");
      return next;
    });
    toast.success("Plan deleted");
  };

  const addShare = async () => {
    if (!current || !shareEmail.trim()) return;
    const email = shareEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from("training_plan_shares")
      .insert({ plan_id: current.id, shared_with_email: email })
      .select()
      .single();
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already shared" : "Failed to share");
      return;
    }
    setShares((s) => [...s, data]);
    setShareEmail("");
    toast.success(`Shared with ${email}`);
  };

  const removeShare = async (id: string) => {
    const { error } = await supabase.from("training_plan_shares").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    setShares((s) => s.filter((x) => x.id !== id));
  };

  const updateRow = (id: string, field: keyof DeliveryRow, value: string | number) => {
    if (!current) return;
    updateCurrent({
      rows: current.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const addRow = () => {
    if (!current) return;
    updateCurrent({ rows: [...current.rows, { id: newId(), label: "New task", percent: 0 }] });
  };

  const removeRow = (id: string) => {
    if (!current) return;
    updateCurrent({ rows: current.rows.filter((r) => r.id !== id) });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const broker = current ? (current.mission_sold_at * current.broker_pct) / 100 : 0;
  const missionBudget = current ? current.mission_sold_at - broker - current.charge_mission : 0;
  const totalPct = current ? current.rows.reduce((s, r) => s + (r.percent || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          <section className="py-10">
            <div className="container mx-auto px-4 space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold mb-2">Training Management</h1>
                  <p className="text-muted-foreground">
                    Cloud-saved training plans. Share with collaborators by email.
                  </p>
                </div>
                <div className="flex gap-2">
                  {current && (
                    <Button onClick={persist} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                  )}
                  {visibleService && (
                    <Button onClick={() => createNew()} variant="outline" className="gap-1.5">
                      <UserPlus className="w-4 h-4" /> Add Client
                    </Button>
                  )}
                </div>
              </div>

              {/* Services list */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Your Services ({services.length})
                  </CardTitle>
                  <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> New Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create new service</DialogTitle>
                        <DialogDescription>
                          e.g. "Cybersecurity Level 1". A first client will be added under it.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          placeholder="Service name"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && createService()}
                        />
                        <Button onClick={createService}>Create</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No services yet. Click "New Service" to get started.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {services.map((s) => {
                          const count = plans.filter((p) => (p.service_name || "General") === s).length;
                          const active = s === visibleService;
                          return (
                            <button
                              key={s}
                              onClick={() => setActiveService(s)}
                              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                active ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                              {s}
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{count}</Badge>
                            </button>
                          );
                        })}
                      </div>

                      {/* Clients under selected service */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Clients in "{visibleService}" ({clientsForService.length})
                          </Label>
                          <Button size="sm" variant="ghost" onClick={() => createNew()} className="gap-1 h-7 text-xs">
                            <UserPlus className="w-3 h-3" /> Add Client
                          </Button>
                        </div>
                        {clientsForService.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No clients yet for this service.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {clientsForService.map((p, idx) => {
                              const active = p.id === currentId;
                              const sharedWithMe = user && p.owner_id !== user.id;
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors ${
                                    active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                                  }`}
                                >
                                  <button onClick={() => setCurrentId(p.id)} className="font-medium">
                                    {p.client_name || p.name || "Unnamed client"}
                                  </button>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                    {ordinal(idx + 1)}
                                  </Badge>
                                  {sharedWithMe && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                      shared
                                    </Badge>
                                  )}
                                  {p.owner_id === user?.id && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete this client?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            "{p.client_name || p.name}" will be permanently removed.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deletePlan(p.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {!current ? null : (
                <>
                  {/* Mission inputs */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-display">Mission Setup</CardTitle>
                      {isOwner && (
                        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Share2 className="w-3.5 h-3.5" /> Share ({shares.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Share "{current.name}"</DialogTitle>
                              <DialogDescription>
                                Add an email to give that account view & edit access to this plan.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <Input
                                  type="email"
                                  placeholder="email@example.com"
                                  value={shareEmail}
                                  onChange={(e) => setShareEmail(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && addShare()}
                                />
                                <Button onClick={addShare} className="gap-1.5">
                                  <Plus className="w-4 h-4" /> Add
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" /> Shared with
                                </Label>
                                {shares.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Not shared yet.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {shares.map((s) => (
                                      <div
                                        key={s.id}
                                        className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                                      >
                                        <span>{s.shared_with_email}</span>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                          onClick={() => removeShare(s.id)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label>Service</Label>
                        <Input
                          value={current.service_name || ""}
                          onChange={(e) => updateCurrent({ service_name: e.target.value })}
                          placeholder="e.g. Cybersecurity Level 1"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label>Client Name</Label>
                        <Input
                          value={current.client_name || ""}
                          onChange={(e) => updateCurrent({ client_name: e.target.value, name: e.target.value })}
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mission Sold At</Label>
                        <Input
                          type="number"
                          value={current.mission_sold_at}
                          onChange={(e) =>
                            updateCurrent({ mission_sold_at: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Broker (%)</Label>
                        <Input
                          type="number"
                          value={current.broker_pct}
                          onChange={(e) =>
                            updateCurrent({ broker_pct: parseFloat(e.target.value) || 0 })
                          }
                        />
                        <p className="text-xs text-muted-foreground">= {fmt(broker)}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Charge Mission</Label>
                        <Input
                          type="number"
                          value={current.charge_mission}
                          onChange={(e) =>
                            updateCurrent({ charge_mission: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mission Budget</Label>
                        <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 font-semibold">
                          {fmt(missionBudget)}
                        </div>
                        <p className="text-xs text-muted-foreground">Sold − Broker − Charge</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery breakdown */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-display">
                          Delivery Budget ({ordinal(deliveryNumber)} Time) — {current.service_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {fmt(missionBudget)} · Allocated: {totalPct}%
                          {totalPct !== 100 && (
                            <span className="text-destructive ml-2">(should equal 100%)</span>
                          )}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Task
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">%</TableHead>
                              <TableHead>Task</TableHead>
                              <TableHead className="w-[140px] text-right">Amount</TableHead>
                              <TableHead className="w-[50px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {current.rows.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="p-1.5">
                                  <Input
                                    type="number"
                                    value={r.percent}
                                    onChange={(e) =>
                                      updateRow(r.id, "percent", parseFloat(e.target.value) || 0)
                                    }
                                    className="h-8 text-sm"
                                  />
                                </TableCell>
                                <TableCell className="p-1.5">
                                  <Input
                                    value={r.label}
                                    onChange={(e) => updateRow(r.id, "label", e.target.value)}
                                    className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                  />
                                </TableCell>
                                <TableCell className="p-1.5 text-right font-mono text-sm">
                                  {fmt((missionBudget * r.percent) / 100)}
                                </TableCell>
                                <TableCell className="p-1.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                    onClick={() => removeRow(r.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-semibold bg-muted/30">
                              <TableCell className="p-2">{totalPct}%</TableCell>
                              <TableCell className="p-2">Total</TableCell>
                              <TableCell className="p-2 text-right font-mono">
                                {fmt((missionBudget * totalPct) / 100)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
    </div>
  );
}
