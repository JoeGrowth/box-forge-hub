import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DayRow {
  index: number;
  action1: string;
  action2: string;
  done1: boolean;
  done2: boolean;
}

// Default actions per day index (0-25). Anchored to start date 07/04/2025 (Mon).
// Dates 5,6,12,13,19,20 = weekends.
const DEFAULT_ACTIONS: Record<number, [string, string]> = {
  0: ["Preparation", ""],
  1: ["Kick off Meeting", ""],
  2: ["Preparation", ""],
  3: ["Empathy (i1) (i2)", "Mapping & Discovery"],
  4: ["Inspection", "Empathy (i3) + M&D"],
  7: ["Preparation", ""],
  8: ["Prep Workshop", ""],
  9: ["Animate Workshop (1)", ""],
  10: ["Document", ""],
  11: ["Animate Workshop (2)", "Receive Paiement"],
  14: ["Document & Centralize", ""],
  15: ["Document & Centralize", "Start Writing Policies"],
  16: ["Document & Centralize", "Start Writing Report"],
  17: ["Write Policies", "Revise & Confirm"],
  18: ["Send Facture", "Revise & Confirm"],
  21: ["Closing Meeting", ""],
  22: ["Closing Meeting", ""],
  23: ["-", ""],
  24: ["-", ""],
  25: ["Recieve Paiment", ""],
};

const DAY_LABELS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const fmt = (n: number) =>
  isNaN(n) ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function ConsultingManagement() {
  const [startDate, setStartDate] = useState("2025-04-07");
  const [normalRate, setNormalRate] = useState(170);
  const [weekendRate, setWeekendRate] = useState(100);
  const [persons, setPersons] = useState(4);
  const [totalDays, setTotalDays] = useState(26); // indexes 0..25

  const [rows, setRows] = useState<DayRow[]>(() =>
    Array.from({ length: 26 }, (_, i) => ({
      index: i,
      action1: DEFAULT_ACTIONS[i]?.[0] ?? "",
      action2: DEFAULT_ACTIONS[i]?.[1] ?? "",
      done1: false,
      done2: false,
    }))
  );

  const start = useMemo(() => new Date(startDate + "T00:00:00"), [startDate]);

  const visibleRows = rows.slice(0, totalDays);

  const computed = useMemo(() => {
    return visibleRows.map((r) => {
      const d = new Date(start);
      d.setDate(start.getDate() + r.index);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const rate = isWeekend ? weekendRate : normalRate;
      return { ...r, date: d, isWeekend, dayLabel: DAY_LABELS_FR[dow], rate };
    });
  }, [visibleRows, start, normalRate, weekendRate]);

  const total = useMemo(() => computed.reduce((s, r) => s + r.rate, 0), [computed]);
  const workingDays = computed.filter((r) => !r.isWeekend).length;

  const updateRow = (idx: number, field: keyof DayRow, value: string | boolean) => {
    setRows((rs) => rs.map((r) => (r.index === idx ? { ...r, [field]: value } : r)));
  };

  // Group by week (every 7 days from start, broken at Sunday)
  const grouped = useMemo(() => {
    const groups: { weekNum: number; rows: typeof computed }[] = [];
    let currentWeek = 0;
    let lastDow = -1;
    computed.forEach((r) => {
      const dow = r.date.getDay();
      if (lastDow === -1 || (dow === 1 && lastDow !== 1)) {
        currentWeek++;
        groups.push({ weekNum: currentWeek, rows: [] });
      } else if (groups.length === 0) {
        groups.push({ weekNum: ++currentWeek, rows: [] });
      }
      groups[groups.length - 1].rows.push(r);
      lastDow = dow;
    });
    return groups;
  }, [computed]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          <section className="py-10">
            <div className="container mx-auto px-4 space-y-8">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">Consulting Management</h1>
                <p className="text-muted-foreground">
                  Plan a consulting mission day by day. Edit start date, rates, and actions — totals recalculate live.
                </p>
              </div>

              {/* Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-display">Daily Rate</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Mission Start</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Normal</Label>
                    <Input
                      type="number"
                      value={normalRate}
                      onChange={(e) => setNormalRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekend</Label>
                    <Input
                      type="number"
                      value={weekendRate}
                      onChange={(e) => setWeekendRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nbre de person</Label>
                    <Input
                      type="number"
                      value={persons}
                      onChange={(e) => setPersons(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Days Sold</Label>
                    <Input
                      type="number"
                      value={totalDays}
                      onChange={(e) => setTotalDays(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">{workingDays} working days</p>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-display">Mission Schedule</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: <span className="font-semibold text-foreground">{fmt(total)}</span> · {totalDays} days indexed 0–{totalDays - 1}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Week</TableHead>
                          <TableHead className="w-[100px]">Day</TableHead>
                          <TableHead className="w-[110px]">Date</TableHead>
                          <TableHead>Action 1</TableHead>
                          <TableHead className="w-[40px]" />
                          <TableHead>Action 2</TableHead>
                          <TableHead className="w-[40px]" />
                          <TableHead className="w-[80px] text-right">Rate</TableHead>
                          <TableHead className="w-[50px] text-right">#</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grouped.map((g) =>
                          g.rows.map((r, i) => (
                            <TableRow
                              key={r.index}
                              className={r.isWeekend ? "bg-rose-50/60 dark:bg-rose-950/20" : "bg-emerald-50/40 dark:bg-emerald-950/10"}
                            >
                              {i === 0 && (
                                <TableCell rowSpan={g.rows.length} className="font-medium align-middle border-r">
                                  Week {g.weekNum}
                                </TableCell>
                              )}
                              <TableCell className="capitalize text-sm">{r.dayLabel}</TableCell>
                              <TableCell className="text-sm font-mono">{fmtDate(r.date)}</TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  value={r.action1}
                                  onChange={(e) => updateRow(r.index, "action1", e.target.value)}
                                  className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                  disabled={r.isWeekend}
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                {!r.isWeekend && r.action1 && r.action1 !== "-" && (
                                  <Checkbox
                                    checked={r.done1}
                                    onCheckedChange={(v) => updateRow(r.index, "done1", !!v)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input
                                  value={r.action2}
                                  onChange={(e) => updateRow(r.index, "action2", e.target.value)}
                                  className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                  disabled={r.isWeekend}
                                />
                              </TableCell>
                              <TableCell className="p-1.5">
                                {!r.isWeekend && r.action2 && (
                                  <Checkbox
                                    checked={r.done2}
                                    onCheckedChange={(v) => updateRow(r.index, "done2", !!v)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{fmt(r.rate)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                {r.index}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        <TableRow className="font-semibold bg-muted/40">
                          <TableCell colSpan={7} className="text-right">Total</TableCell>
                          <TableCell className="text-right font-mono">{fmt(total)}</TableCell>
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
