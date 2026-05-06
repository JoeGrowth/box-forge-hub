import { useState, useMemo } from "react";
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
import { Plus, Trash2 } from "lucide-react";

interface DeliveryRow {
  id: string;
  label: string;
  percent: number;
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

export default function TrainingManagement() {
  const [missionSoldAt, setMissionSoldAt] = useState<number>(3450);
  const [brokerPct, setBrokerPct] = useState<number>(5);
  const [chargeMission, setChargeMission] = useState<number>(0);
  const [rows, setRows] = useState<DeliveryRow[]>(DEFAULT_DELIVERY);

  const broker = useMemo(() => (missionSoldAt * brokerPct) / 100, [missionSoldAt, brokerPct]);
  const missionBudget = useMemo(
    () => missionSoldAt - broker - chargeMission,
    [missionSoldAt, broker, chargeMission]
  );
  const totalPct = useMemo(() => rows.reduce((s, r) => s + (r.percent || 0), 0), [rows]);

  const updateRow = (id: string, field: keyof DeliveryRow, value: string | number) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((rs) => [...rs, { id: String(Date.now()), label: "New task", percent: 0 }]);
  };

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          <section className="py-10">
            <div className="container mx-auto px-4 space-y-8">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">Training Management</h1>
                <p className="text-muted-foreground">
                  Plan a training mission budget. Edit any field — totals recalculate live.
                </p>
              </div>

              {/* Mission inputs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-display">Mission Setup</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Mission Sold At</Label>
                    <Input
                      type="number"
                      value={missionSoldAt}
                      onChange={(e) => setMissionSoldAt(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Broker (%)</Label>
                    <Input
                      type="number"
                      value={brokerPct}
                      onChange={(e) => setBrokerPct(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">= {fmt(broker)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Charge Mission</Label>
                    <Input
                      type="number"
                      value={chargeMission}
                      onChange={(e) => setChargeMission(parseFloat(e.target.value) || 0)}
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
                        {rows.map((r) => (
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
