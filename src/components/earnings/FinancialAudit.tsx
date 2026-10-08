import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ShieldAlert, Map, ChevronDown, ChevronUp } from "lucide-react";

type Num = string;
interface Audit {
  currency: string;
  netIncome: Num; otherIncome: Num; cash: Num;
  stability: "stable" | "variable" | "unemployed" | "";
  housing: Num; food: Num; transport: Num; utilities: Num; family: Num; other: Num;
  debtBalance: Num; debtMonthly: Num; debtRate: Num;
  overdueAmount: Num; overdueDeadline: string; overdueConsequence: string;
  assets: Num; assetsNote: string;
  objective: "payday" | "debt" | "emergency" | "income" | "wealth" | "";
}

const EMPTY: Audit = {
  currency: "TND", netIncome: "", otherIncome: "", cash: "", stability: "",
  housing: "", food: "", transport: "", utilities: "", family: "", other: "",
  debtBalance: "", debtMonthly: "", debtRate: "",
  overdueAmount: "", overdueDeadline: "", overdueConsequence: "",
  assets: "", assetsNote: "", objective: "",
};

const v = (s: string) => { const n = parseFloat(String(s).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const f = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([k, l]) => (
        <Button key={k} type="button" size="sm" variant={value === k ? "default" : "outline"} onClick={() => onChange(k)}>{l}</Button>
      ))}
    </div>
  );
}

export function FinancialAudit({ userId }: { userId?: string }) {
  const key = `financial-audit:${userId ?? "anon"}`;
  const [a, setA] = useState<Audit>(EMPTY);
  const [open, setOpen] = useState(true);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) { setA({ ...EMPTY, ...JSON.parse(raw) }); setShowPlan(true); } } catch { /* ignore */ }
  }, [key]);

  const set = <K extends keyof Audit>(k: K, val: Audit[K]) => setA((p) => ({ ...p, [k]: val }));
  const num = (k: keyof Audit, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={a[k] as string} onChange={(e) => set(k, e.target.value.slice(0, 15) as never)} placeholder="—" />
    </div>
  );

  const r = useMemo(() => {
    const income = v(a.netIncome) + v(a.otherIncome);
    const essential = v(a.housing) + v(a.food) + v(a.transport) + v(a.utilities) + v(a.family);
    const expenses = essential + v(a.other) + v(a.debtMonthly);
    const cashflow = income - expenses;
    const debtRatio = income > 0 ? (v(a.debtMonthly) / income) * 100 : v(a.debtMonthly) > 0 ? 100 : 0;
    const shortfall = cashflow < 0 ? -cashflow : 0;
    const runway = shortfall > 0 ? v(a.cash) / shortfall : essential > 0 ? v(a.cash) / essential : 0;
    const netWorth = v(a.cash) + v(a.assets) - v(a.debtBalance) - v(a.overdueAmount);
    return { income, essential, expenses, cashflow, debtRatio, runway, netWorth, shortfall };
  }, [a]);

  const c = a.currency;
  const plan = useMemo(() => {
    const now: string[] = [], d30: string[] = [], d90: string[] = [], long: string[] = [];
    if (v(a.overdueAmount) > 0) now.push(`Settle or negotiate the overdue ${f(v(a.overdueAmount))} ${c}${a.overdueDeadline ? ` before ${a.overdueDeadline}` : ""}. Contact the creditor before the deadline.`);
    now.push("List every obligation: amount, deadline, minimum payment, consequence of missing it.");
    now.push("Pause nonessential purchases and new subscriptions. Keep food, housing, utilities, transport, dependents.");
    if (r.cashflow < 0) now.push(`Monthly shortfall is ${f(r.shortfall)} ${c}. Do not cover it with expensive debt.`);
    if (v(a.other) > 0 && r.cashflow < 0) now.push(`Cut "other spending" (${f(v(a.other))} ${c}) first — it is the only non-essential line.`);

    if (r.cashflow < 0) {
      d30.push(`Close the gap of ${f(r.shortfall)} ${c}/month: target ${f(Math.ceil(r.shortfall / 2))} ${c} cut + ${f(Math.ceil(r.shortfall / 2))} ${c} new income.`);
      d30.push("Deliver at least one paid mission this month through your organizations.");
    } else {
      d30.push(`Surplus is ${f(r.cashflow)} ${c}/month. Move it to a separate account on payday, not at month end.`);
    }
    d30.push(`Cap essential spending at ${f(r.essential)} ${c}. Track every expense weekly.`);
    if (a.stability !== "stable") d30.push("Income is irregular: budget on your lowest month, not your average.");

    const emergencyTarget = r.essential * (a.stability === "stable" ? 3 : 6);
    if (v(a.debtMonthly) > 0) d90.push(`Debt burden is ${r.debtRatio.toFixed(0)}% of income${r.debtRatio > 35 ? " — too high. Renegotiate terms or consolidate at a lower rate." : ". Keep paying minimums; extra cash goes to the highest-rate debt."}`);
    d90.push(`Build a starter buffer of ${f(r.essential)} ${c} (one month of essentials) before extra debt repayment.`);
    if (r.runway < 1) d90.push(`Liquidity runway is ${r.runway.toFixed(1)} month(s). Raising it above 1 month is the priority.`);

    long.push(`Emergency fund target: ${f(emergencyTarget)} ${c} (${a.stability === "stable" ? 3 : 6} months of essentials).`);
    const obj: Record<string, string> = {
      payday: "Objective: stop running out before payday — split income into weekly allowances.",
      debt: "Objective: pay off debt — avalanche method (highest interest first) once the buffer exists.",
      emergency: `Objective: emergency savings — automate a fixed transfer until ${f(emergencyTarget)} ${c} is reached.`,
      income: "Objective: increase income — productize your consulting offer and target 3 recurring clients.",
      wealth: "Objective: long-term wealth — after the emergency fund, invest a fixed % of income monthly; grow equity in your entities.",
    };
    if (a.objective) long.push(obj[a.objective]);
    long.push(`Net worth today: ${f(r.netWorth)} ${c}. Re-run this audit monthly to track it.`);
    return { now, d30, d90, long };
  }, [a, r, c]);

  const generate = () => { localStorage.setItem(key, JSON.stringify(a)); setShowPlan(true); };
  const reset = () => { localStorage.removeItem(key); setA(EMPTY); setShowPlan(false); };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5" /> Personal financial audit</CardTitle>
            <CardDescription>Monthly amounts. Estimates are fine. Leave unknown figures blank.</CardDescription>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <Label>Currency</Label>
            <Choice value={a.currency} options={[["TND", "TND"], ["EUR", "EUR"], ["USD", "USD"], ["Other", "Other"]]} onChange={(x) => set("currency", x)} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Income and available money</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {num("netIncome", "Net monthly income after taxes")}
              {num("otherIncome", "Other monthly income")}
              {num("cash", "Cash and bank balances now")}
            </div>
            <Label className="text-xs">Income stability</Label>
            <Choice value={a.stability} options={[["stable", "Stable salary"], ["variable", "Variable / irregular"], ["unemployed", "Currently unemployed"]]} onChange={(x) => set("stability", x)} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Monthly expenses</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {num("housing", "Housing (rent / mortgage)")}
              {num("food", "Food and household")}
              {num("transport", "Transport")}
              {num("utilities", "Utilities, phone, internet")}
              {num("family", "Family support / dependents")}
              {num("other", "Other spending / recurring")}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Debt and financial position</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {num("debtBalance", "Debts outstanding (balance)")}
              {num("debtMonthly", "Monthly debt payment")}
              {num("debtRate", "Interest rate % (if known)")}
              {num("overdueAmount", "Overdue / urgent amount")}
              <div className="space-y-1"><Label className="text-xs">Deadline</Label><Input type="date" value={a.overdueDeadline} onChange={(e) => set("overdueDeadline", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Consequence of non-payment</Label><Input maxLength={200} value={a.overdueConsequence} onChange={(e) => set("overdueConsequence", e.target.value)} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {num("assets", "Savings and assets (value)")}
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Assets detail</Label><Textarea rows={1} maxLength={500} value={a.assetsNote} onChange={(e) => set("assetsNote", e.target.value)} placeholder="Savings, investments, vehicle, property…" /></div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Primary objective</h3>
            <Choice value={a.objective} options={[["payday", "Stop running out before payday"], ["debt", "Pay off debt"], ["emergency", "Build emergency savings"], ["income", "Increase income"], ["wealth", "Build long-term wealth"]]} onChange={(x) => set("objective", x)} />
          </section>

          <div className="flex gap-2">
            <Button onClick={generate}>Generate my plan</Button>
            <Button variant="ghost" onClick={reset}>Reset</Button>
          </div>

          {showPlan && (
            <div className="space-y-5 border-t pt-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  ["Net cash flow", `${f(r.cashflow)} ${c}`, r.cashflow < 0],
                  ["Essential spending", `${f(r.essential)} ${c}`, false],
                  ["Debt burden", `${r.debtRatio.toFixed(0)}%`, r.debtRatio > 35],
                  ["Liquidity runway", `${r.runway.toFixed(1)} mo`, r.runway < 1],
                  ["Net worth", `${f(r.netWorth)} ${c}`, r.netWorth < 0],
                ].map(([l, val, bad]) => (
                  <div key={l as string} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{l}</p>
                    <p className={`text-lg font-bold ${bad ? "text-destructive" : ""}`}>{val}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" /> Immediate stabilization</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  <li>Protect essentials first: food, housing, utilities, necessary transport, medical needs, dependents.</li>
                  <li>Stop avoidable leakage. Do not cut essential spending indiscriminately.</li>
                  <li>Do not add expensive debt to cover recurring shortfalls.</li>
                  <li>Preserve liquidity. Never commit all cash to debt if essentials become uncovered.</li>
                  {v(a.overdueAmount) > 0 && <li className="font-medium">Overdue payment of {f(v(a.overdueAmount))} {c} takes priority over savings{a.overdueConsequence ? ` (risk: ${a.overdueConsequence})` : ""}.</li>}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold"><Map className="h-4 w-4" /> The plan from now on</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {([["Next 7 days", plan.now], ["Next 30 days — cash flow", plan.d30], ["Next 90 days — debt & savings", plan.d90], ["Long term", plan.long]] as [string, string[]][]).map(([t, items]) => (
                    <div key={t} className="rounded-lg border p-4">
                      <Badge variant="secondary" className="mb-2">{t}</Badge>
                      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
