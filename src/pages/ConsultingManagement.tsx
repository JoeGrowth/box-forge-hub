import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayRow {
  index: number;
  action1: string;
  action2: string;
  done1: boolean;
  done2: boolean;
}

const DEFAULT_ACTIONS_BY_INDEX: Record<number, [string, string]> = {
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
  25: ["Recieve Paiment", ""],
};

const DEFAULT_ACTION_LIBRARY = [
  "Preparation",
  "Kick off Meeting",
  "Empathy (i1) (i2)",
  "Empathy (i3) + M&D",
  "Mapping & Discovery",
  "Inspection",
  "Prep Workshop",
  "Animate Workshop (1)",
  "Animate Workshop (2)",
  "Document",
  "Document & Centralize",
  "Start Writing Policies",
  "Start Writing Report",
  "Write Policies",
  "Revise & Confirm",
  "Send Facture",
  "Receive Paiement",
  "Closing Meeting",
  "-",
];

const DAY_LABELS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const fmt = (n: number) =>
  isNaN(n) ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

function ActionPicker({
  value,
  options,
  onChange,
  onAddOption,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onAddOption: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const showCreate =
    query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "w-full justify-between h-8 px-2 font-normal text-sm",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || "Select…"}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                  className="text-muted-foreground italic"
                >
                  Clear
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  onSelect={() => {
                    const v = query.trim();
                    onAddOption(v);
                    onChange(v);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add "{query.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ConsultingManagement() {
  const [startDate, setStartDate] = useState("2025-04-07");
  const [normalRate, setNormalRate] = useState(170);
  const [weekendRate, setWeekendRate] = useState(100);
  const [persons, setPersons] = useState(4);
  const [totalDays, setTotalDays] = useState(26);

  const [actionLibrary, setActionLibrary] = useState<string[]>(DEFAULT_ACTION_LIBRARY);
  const [rows, setRows] = useState<DayRow[]>(() =>
    Array.from({ length: 26 }, (_, i) => ({
      index: i,
      action1: DEFAULT_ACTIONS_BY_INDEX[i]?.[0] ?? "",
      action2: DEFAULT_ACTIONS_BY_INDEX[i]?.[1] ?? "",
      done1: false,
      done2: false,
    }))
  );

  // Grow/shrink rows when totalDays changes — preserve existing edits.
  useEffect(() => {
    setRows((prev) => {
      if (totalDays === prev.length) return prev;
      if (totalDays < prev.length) return prev.slice(0, totalDays);
      const extra = Array.from({ length: totalDays - prev.length }, (_, k) => {
        const i = prev.length + k;
        return {
          index: i,
          action1: DEFAULT_ACTIONS_BY_INDEX[i]?.[0] ?? "",
          action2: DEFAULT_ACTIONS_BY_INDEX[i]?.[1] ?? "",
          done1: false,
          done2: false,
        };
      });
      return [...prev, ...extra];
    });
  }, [totalDays]);

  const start = useMemo(() => new Date(startDate + "T00:00:00"), [startDate]);

  const computed = useMemo(() => {
    return rows.map((r) => {
      const d = new Date(start);
      d.setDate(start.getDate() + r.index);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const rate = isWeekend ? weekendRate : normalRate;
      return { ...r, date: d, isWeekend, dayLabel: DAY_LABELS_FR[dow], rate };
    });
  }, [rows, start, normalRate, weekendRate]);

  const total = useMemo(() => computed.reduce((s, r) => s + r.rate, 0), [computed]);
  const workingDays = computed.filter((r) => !r.isWeekend).length;

  const updateRow = (idx: number, field: keyof DayRow, value: string | boolean) => {
    setRows((rs) => rs.map((r) => (r.index === idx ? { ...r, [field]: value } : r)));
  };

  const addOption = (v: string) => {
    setActionLibrary((lib) => (lib.includes(v) ? lib : [...lib, v]));
  };

  // Group by week — break on Monday
  const grouped = useMemo(() => {
    const groups: { weekNum: number; rows: typeof computed }[] = [];
    let weekNum = 0;
    let lastDow = -1;
    computed.forEach((r) => {
      const dow = r.date.getDay();
      const startNew = lastDow === -1 || (dow === 1 && lastDow !== 1);
      if (startNew) {
        weekNum++;
        groups.push({ weekNum, rows: [] });
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
                  Plan a consulting mission day by day. Set the number of days sold — weeks, dates, and weekends update automatically.
                </p>
              </div>

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
                      min={1}
                      value={totalDays}
                      onChange={(e) =>
                        setTotalDays(Math.max(1, parseInt(e.target.value) || 1))
                      }
                    />
                    <p className="text-xs text-muted-foreground">{workingDays} working days</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-display">Mission Schedule</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: <span className="font-semibold text-foreground">{fmt(total)}</span>{" "}
                      · {totalDays} days indexed 0–{totalDays - 1} · {grouped.length} weeks
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
                              className={
                                r.isWeekend
                                  ? "bg-rose-50/60 dark:bg-rose-950/20"
                                  : "bg-emerald-50/40 dark:bg-emerald-950/10"
                              }
                            >
                              {i === 0 && (
                                <TableCell
                                  rowSpan={g.rows.length}
                                  className="font-medium align-middle border-r"
                                >
                                  Week {g.weekNum}
                                </TableCell>
                              )}
                              <TableCell className="capitalize text-sm">{r.dayLabel}</TableCell>
                              <TableCell className="text-sm font-mono">{fmtDate(r.date)}</TableCell>
                              <TableCell className="p-1.5">
                                <ActionPicker
                                  value={r.action1}
                                  options={actionLibrary}
                                  onChange={(v) => updateRow(r.index, "action1", v)}
                                  onAddOption={addOption}
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
                                <ActionPicker
                                  value={r.action2}
                                  options={actionLibrary}
                                  onChange={(v) => updateRow(r.index, "action2", v)}
                                  onAddOption={addOption}
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
                              <TableCell className="text-right font-mono text-sm">
                                {fmt(r.rate)}
                              </TableCell>
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
