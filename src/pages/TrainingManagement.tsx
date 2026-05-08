import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Save, FilePlus, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface DeliveryRow {
  id: string;
  label: string;
  percent: number;
}

interface TrainingPlan {
  id: string;
  name: string;
  missionSoldAt: number;
  brokerPct: number;
  chargeMission: number;
  rows: DeliveryRow[];
  updatedAt: string;
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

const STORAGE_KEY = "training_management_plans_v1";

const fmt = (n: number) =>
  isNaN(n) ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const blankPlan = (): TrainingPlan => ({
  id: newId(),
  name: "Untitled Training",
  missionSoldAt: 3450,
  brokerPct: 5,
  chargeMission: 0,
  rows: DEFAULT_DELIVERY.map((r) => ({ ...r })),
  updatedAt: new Date().toISOString(),
});

export default function TrainingManagement() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  // Load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: TrainingPlan[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setPlans(parsed);
          setCurrentId(parsed[0].id);
          return;
        }
      }
    } catch {}
    const p = blankPlan();
    setPlans([p]);
    setCurrentId(p.id);
  }, []);

  const current = plans.find((p) => p.id === currentId);

  const updateCurrent = (patch: Partial<TrainingPlan>) => {
    setPlans((ps) =>
      ps.map((p) => (p.id === currentId ? { ...p, ...patch } : p))
    );
  };

  const persist = () => {
    setPlans((ps) => {
      const updated = ps.map((p) =>
        p.id === currentId ? { ...p, updatedAt: new Date().toISOString() } : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.success("Plan saved");
      return updated;
    });
  };

  const createNew = () => {
    const p = blankPlan();
    setPlans((ps) => {
      const next = [p, ...ps];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setCurrentId(p.id);
    toast.success("New plan created");
  };

  const deletePlan = (id: string) => {
    setPlans((ps) => {
      const next = ps.filter((p) => p.id !== id);
      const final = next.length ? next : [blankPlan()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
      if (id === currentId) setCurrentId(final[0].id);
      return final;
    });
    toast.success("Plan deleted");
  };

  if (!current) return null;

  const broker = (current.missionSoldAt * current.brokerPct) / 100;
  const missionBudget = current.missionSoldAt - broker - current.chargeMission;
  const totalPct = current.rows.reduce((s, r) => s + (r.percent || 0), 0);

  const updateRow = (id: string, field: keyof DeliveryRow, value: string | number) => {
    updateCurrent({
      rows: current.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const addRow = () => {
    updateCurrent({
      rows: [...current.rows, { id: newId(), label: "New task", percent: 0 }],
    });
  };

  const removeRow = (id: string) => {
    updateCurrent({ rows: current.rows.filter((r) => r.id !== id) });
  };

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
                    Save multiple training plans. Each mission gets its own budget breakdown.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={persist} className="gap-1.5">
                    <Save className="w-4 h-4" /> Save
                  </Button>
                  <Button onClick={createNew} variant="outline" className="gap-1.5">
                    <FilePlus className="w-4 h-4" /> New Plan
                  </Button>
                </div>
              </div>

              {/* Saved plans list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> Saved Plans ({plans.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {plans.map((p) => {
                      const active = p.id === currentId;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <button
                            onClick={() => setCurrentId(p.id)}
                            className="font-medium"
                          >
                            {p.name || "Untitled"}
                          </button>
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
                                <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{p.name}" will be permanently removed.
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
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Mission inputs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-display">Mission Setup</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Plan Name</Label>
                    <Input
                      value={current.name}
                      onChange={(e) => updateCurrent({ name: e.target.value })}
                      placeholder="e.g. Acme Workshop"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mission Sold At</Label>
                    <Input
                      type="number"
                      value={current.missionSoldAt}
                      onChange={(e) =>
                        updateCurrent({ missionSoldAt: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Broker (%)</Label>
                    <Input
                      type="number"
                      value={current.brokerPct}
                      onChange={(e) =>
                        updateCurrent({ brokerPct: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">= {fmt(broker)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Charge Mission</Label>
                    <Input
                      type="number"
                      value={current.chargeMission}
                      onChange={(e) =>
                        updateCurrent({ chargeMission: parseFloat(e.target.value) || 0 })
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
                      Delivery Budget (First Time)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {fmt(missionBudget)} · Allocated: {totalPct}%
                      {totalPct !== 100 && (
                        <span className="text-destructive ml-2">
                          (should equal 100%)
                        </span>
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
            </div>
          </section>
        </main>
      </PageTransition>
    </div>
  );
}
