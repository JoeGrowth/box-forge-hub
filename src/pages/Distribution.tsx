import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Briefcase, GraduationCap, CalendarDays } from "lucide-react";

type Task = { id: string; label: string; percent: number };
type Charge = { id: string; label: string; amount: number };

const uid = () => Math.random().toString(36).slice(2, 9);

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

function DistributionBuilder({
  kind,
  defaultTitle,
  defaultBudgetLabel,
  defaultTasks,
  defaultCharges,
}: {
  kind: "consulting" | "training" | "event";
  defaultTitle: string;
  defaultBudgetLabel: string;
  defaultTasks: Task[];
  defaultCharges: Charge[];
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [budget, setBudget] = useState<number>(420);
  const [budgetLabel, setBudgetLabel] = useState(defaultBudgetLabel);
  const [charges, setCharges] = useState<Charge[]>(defaultCharges);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [people, setPeople] = useState<string[]>(["Person (1)", "Person (2)"]);

  const chargesTotal = useMemo(() => charges.reduce((s, c) => s + (Number(c.amount) || 0), 0), [charges]);
  const internalPool = Math.max(0, (Number(budget) || 0) - chargesTotal);
  const totalPercent = useMemo(() => tasks.reduce((s, t) => s + (Number(t.percent) || 0), 0), [tasks]);

  const taskAmounts = tasks.map((t) => (internalPool * (Number(t.percent) || 0)) / 100);
  const perPersonPerTask = taskAmounts.map((amt) => (people.length > 0 ? amt / people.length : 0));
  const perPersonTotal = people.map((_, idx) => perPersonPerTask.reduce((s, arr) => s + arr, 0) / 1);
  // per-person total (equal split): each person gets sum(taskAmounts)/people.length
  const perPersonEqual = people.length > 0 ? taskAmounts.reduce((s, a) => s + a, 0) / people.length : 0;

  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updateCharge = (id: string, patch: Partial<Charge>) =>
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mission Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Mission title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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

      {/* Charges */}
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

      {/* People */}
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

      {/* Internal & Structure breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Internal &amp; Structure — task distribution</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTasks((p) => [...p, { id: uid(), label: "New task", percent: 0 }])}
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
                <TableRow key={t.id}>
                  <TableCell>
                    <Input value={t.label} onChange={(e) => updateTask(t.id, { label: e.target.value })} />
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
                      {fmt(perPersonPerTask[idx])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
    { id: uid(), label: "Rest structure", percent: 5 },
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
    { id: uid(), label: "Rest structure", percent: 10 },
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
    { id: uid(), label: "Rest Structure Event", percent: 10 },
  ] as Task[],
  charges: [
    { id: uid(), label: "Matériels & matériaux", amount: 80 },
    { id: uid(), label: "Espace", amount: 70 },
    { id: uid(), label: "Artiste (…)", amount: 0 },
  ] as Charge[],
};

export default function Distribution() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <header className="mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Distribution
              </h1>
              <p className="text-muted-foreground">
                Split budgets fairly across charges, structure and the people doing the work — per
                consulting mission, training mission, or event.
              </p>
            </header>

            <Tabs defaultValue="consulting" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6 max-w-2xl">
                <TabsTrigger value="consulting" className="gap-2">
                  <Briefcase className="w-4 h-4" /> Consulting
                </TabsTrigger>
                <TabsTrigger value="training" className="gap-2">
                  <GraduationCap className="w-4 h-4" /> Training
                </TabsTrigger>
                <TabsTrigger value="event" className="gap-2">
                  <CalendarDays className="w-4 h-4" /> Event
                </TabsTrigger>
              </TabsList>

              <TabsContent value="consulting">
                <DistributionBuilder
                  kind="consulting"
                  defaultTitle="Consulting Mission (1)"
                  defaultBudgetLabel="Budget Mission"
                  defaultTasks={consultingDefaults.tasks}
                  defaultCharges={consultingDefaults.charges}
                />
              </TabsContent>
              <TabsContent value="training">
                <DistributionBuilder
                  kind="training"
                  defaultTitle="Training Mission (1)"
                  defaultBudgetLabel="Budget Formation"
                  defaultTasks={trainingDefaults.tasks}
                  defaultCharges={trainingDefaults.charges}
                />
              </TabsContent>
              <TabsContent value="event">
                <DistributionBuilder
                  kind="event"
                  defaultTitle="Bijoux Dry Clay"
                  defaultBudgetLabel="Budget Livraison"
                  defaultTasks={eventDefaults.tasks}
                  defaultCharges={eventDefaults.charges}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
}
