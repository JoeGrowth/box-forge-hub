import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTalentMonetized, MONETIZATION_TARGET } from "@/hooks/useTalentMonetized";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Lock,
  TrendingUp,
  Users,
  Banknote,
  PieChart,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import ConsultingGrowth from "./ConsultingGrowth";

interface IncomeOpp {
  id: string;
  title: string;
  client_name: string | null;
  currency: string | null;
  stage: string;
  number_of_days: number | null;
  amount_per_day: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  paid_at: string | null;
  created_at: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
};

export default function Income() {
  const { user } = useAuth();
  const { loading: gateLoading, totalDelivered, talentMonetized, soloDelivered, contractorsDelivered } =
    useTalentMonetized();

  const [opps, setOpps] = useState<IncomeOpp[]>([]);
  const [distributed, setDistributed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("consultant_opportunities")
        .select(
          "id,title,client_name,currency,stage,number_of_days,amount_per_day,total_amount,paid_amount,paid_at,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOpps((data ?? []) as IncomeOpp[]);

      const { data: dists } = await supabase
        .from("consultant_opportunity_distributions")
        .select("amount")
        .eq("user_id", user.id);
      setDistributed(((dists ?? []) as { amount: number | null }[]).reduce((s, d) => s + Number(d.amount ?? 0), 0));
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const stats = useMemo(() => {
    const value = (o: IncomeOpp) =>
      Number(o.total_amount ?? (Number(o.number_of_days ?? 0) * Number(o.amount_per_day ?? 0)));
    const collected = opps.reduce((s, o) => s + Number(o.paid_amount ?? 0), 0);
    const pipelineOpps = opps.filter((o) => o.stage !== "closed");
    const pipeline = pipelineOpps.reduce((s, o) => s + value(o), 0);
    const awaiting = opps
      .filter((o) => !o.paid_at)
      .reduce((s, o) => s + value(o), 0);
    const payingClients = new Set(opps.filter((o) => o.paid_at).map((o) => o.client_name).filter(Boolean)).size;
    const closed = opps.filter((o) => o.stage === "closed").length;
    const currency = opps.find((o) => o.currency)?.currency ?? "EUR";
    const avgMission = closed > 0 ? collected / closed : 0;

    // last 6 months of collected income
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    const byMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    opps.forEach((o) => {
      if (!o.paid_at) return;
      const k = monthKey(new Date(o.paid_at));
      if (k in byMonth) byMonth[k] += Number(o.paid_amount ?? 0);
    });

    const byClient: Record<string, number> = {};
    opps.forEach((o) => {
      if (!o.paid_amount) return;
      const key = o.client_name?.trim() || "Unnamed client";
      byClient[key] = (byClient[key] ?? 0) + Number(o.paid_amount);
    });
    const topClients = Object.entries(byClient)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      collected,
      pipeline,
      pipelineCount: pipelineOpps.length,
      awaiting,
      payingClients,
      closed,
      currency,
      avgMission,
      months,
      byMonth,
      topClients,
      net: collected - distributed,
    };
  }, [opps, distributed]);

  if (gateLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!talentMonetized) {
    const pct = Math.min(100, (totalDelivered / MONETIZATION_TARGET) * 100);
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageTransition>
          <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Income is locked</CardTitle>
                <CardDescription>
                  Validate your talent first. Your income dashboard unlocks once Talent Monetized is
                  achieved — {MONETIZATION_TARGET} missions delivered in solo mode and with contractors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Missions delivered</span>
                    <span className="font-semibold">
                      {Math.min(totalDelivered, MONETIZATION_TARGET)}/{MONETIZATION_TARGET}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex gap-2 pt-1">
                    <Badge variant="secondary">Solo {soloDelivered}</Badge>
                    <Badge variant="secondary">With contractors {contractorsDelivered}</Badge>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link to="/consulting-growth">
                    Go to the Consulting Engine <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  const maxMonth = Math.max(1, ...stats.months.map((m) => stats.byMonth[m]));

  const kpis = [
    {
      label: "Income collected",
      value: `${fmt(stats.collected)} ${stats.currency}`,
      sub: `${stats.closed} missions accounted`,
      icon: Banknote,
    },
    {
      label: "Net kept",
      value: `${fmt(stats.net)} ${stats.currency}`,
      sub: `${fmt(distributed)} ${stats.currency} distributed`,
      icon: PieChart,
    },
    {
      label: "Awaiting payment",
      value: `${fmt(stats.awaiting)} ${stats.currency}`,
      sub: `${stats.pipelineCount} missions in pipeline`,
      icon: TrendingUp,
    },
    {
      label: "Paying clients",
      value: String(stats.payingClients),
      sub: `Avg ${fmt(stats.avgMission)} ${stats.currency} / mission`,
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <div className="container mx-auto max-w-6xl px-4 pt-24 pb-8 space-y-6">
          {/* Hero */}
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
            <Badge variant="secondary" className="mb-3">
              <Wallet className="mr-1.5 h-3.5 w-3.5" /> Income
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your income dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Talent Monetized is achieved. Track what you collected, what is still owed, and manage every
              opportunity end-to-end from one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/distribution">Distribution</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/opportunities">Marketplace</Link>
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{k.label}</span>
                    <k.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                    {loading ? <Skeleton className="h-7 w-24" /> : k.value}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="opportunities">Manage opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Collected — last 6 months</CardTitle>
                    <CardDescription>Payments recorded on your missions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-40 items-end gap-3">
                      {stats.months.map((m) => (
                        <div key={m} className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex w-full flex-1 items-end">
                            <div
                              className="w-full rounded-t-md bg-primary/80 transition-all"
                              style={{ height: `${Math.max(2, (stats.byMonth[m] / maxMonth) * 100)}%` }}
                              title={`${fmt(stats.byMonth[m])} ${stats.currency}`}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground">{monthLabel(m)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top paying clients</CardTitle>
                    <CardDescription>Where your income actually comes from</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.topClients.length === 0 && (
                      <p className="text-sm text-muted-foreground">No payment recorded yet.</p>
                    )}
                    {stats.topClients.map(([name, amount]) => (
                      <div key={name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{name}</span>
                          <span className="text-muted-foreground">
                            {fmt(amount)} {stats.currency}
                          </span>
                        </div>
                        <Progress
                          value={(amount / (stats.topClients[0]?.[1] || 1)) * 100}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Open missions</CardTitle>
                  <CardDescription>Everything not yet accounted</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {opps.filter((o) => o.stage !== "closed").length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" /> No open mission. Add one from the opportunities tab.
                    </div>
                  ) : (
                    opps
                      .filter((o) => o.stage !== "closed")
                      .slice(0, 8)
                      .map((o) => {
                        const v = Number(
                          o.total_amount ?? Number(o.number_of_days ?? 0) * Number(o.amount_per_day ?? 0),
                        );
                        return (
                          <div
                            key={o.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{o.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {o.client_name || "No client"} · {o.stage.replace(/_/g, " ")}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold">
                                {fmt(v)} {o.currency || stats.currency}
                              </p>
                              <Badge variant={o.paid_at ? "default" : "secondary"} className="mt-1 text-[10px]">
                                {o.paid_at ? "Paid" : "Unpaid"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <ConsultingGrowth embedded />
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
