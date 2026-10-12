import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { FinancialAudit } from "@/components/earnings/FinancialAudit";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Building2, CheckCircle2, ClipboardList, Clock, Loader2, Trash2 } from "lucide-react";
import { calculateIndividualEarnings, type EarningsEntity, type EarningsMission, type EarningsSlot, type IndividualEarning } from "@/lib/individualEarnings";

interface Org { id: string; name: string; slug: string }
interface Receipt { id: string; entity_id: string; source_key: string; earning_role: string; currency: string; amount: number; received_at: string }
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const money = (totals: Record<string, number>) => Object.entries(totals).map(([currency, amount]) => `${fmt(amount)} ${currency}`).join(" · ") || "—";
const roleLabels = { associe: "Associé", internal: "Entity core team", external: "Operation Task Force and Third Party Charges" };
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export default function Earnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [entities, setEntities] = useState<EarningsEntity[]>([]);
  const [missions, setMissions] = useState<EarningsMission[]>([]);
  const [slots, setSlots] = useState<EarningsSlot[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [fullName, setFullName] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selected, setSelected] = useState<IndividualEarning | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true); setError("");
    (async () => {
      const results = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("declaration_entities").select("id,name,organization_id,split_config"),
        supabase.from("declaration_missions").select("id,entity_id,client,type,budget,currency,internal,external,created_at").order("created_at", { ascending: false }),
        supabase.from("entity_role_assignments").select("entity_id,label,slot,role_slug").eq("linked_user_id", user.id).eq("status", "accepted").eq("entity_type", "declaration_entity"),
        supabase.from("organizations").select("id,name,slug"),
        supabase.from("earnings_bank_receipts").select("id,entity_id,source_key,earning_role,currency,amount,received_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      const failure = results.find(r => r.error);
      if (failure) { setError("Unable to load your earnings. Retry before recording a receipt."); setLoading(false); return; }
      setFullName(results[0].data?.full_name ?? "");
      setEntities(results[1].data as unknown as EarningsEntity[]);
      setMissions(results[2].data as unknown as EarningsMission[]);
      setSlots(results[3].data as EarningsSlot[]);
      setOrgs(results[4].data as Org[]);
      setReceipts(results[5].data as Receipt[]);
      setLoading(false);
    })().catch(() => { if (alive) { setError("Unable to load your earnings."); setLoading(false); } });
    return () => { alive = false; };
  }, [user?.id, retry]);
  const calculated = useMemo(() => calculateIndividualEarnings(entities, missions, slots, user?.id ?? "", fullName), [entities, missions, slots, user?.id, fullName]);
  const receivedFor = (item: IndividualEarning) => receipts.filter(r => r.source_key === item.sourceKey && r.currency === item.currency).reduce((sum, r) => sum + Number(r.amount), 0);
  const groups = entities.filter(entity => calculated.items.some(i => i.entityId === entity.id) || slots.some(s => s.entity_id === entity.id) || receipts.some(r => r.entity_id === entity.id));
  const totals: Record<string, { generated: number; bank: number; awaiting: number }> = {};
  calculated.items.forEach(item => {
    const total = totals[item.currency] ??= { generated: 0, bank: 0, awaiting: 0 };
    total.generated += item.amount; total.awaiting += Math.max(0, item.amount - receivedFor(item));
  });
  receipts.forEach(receipt => { (totals[receipt.currency] ??= { generated: 0, bank: 0, awaiting: 0 }).bank += Number(receipt.amount); });
  const beginReceipt = (item: IndividualEarning) => { setSelected(item); setAmount((Math.max(0, item.amount - receivedFor(item))).toFixed(2)); setDate(today()); };
  const outstanding = selected ? Math.max(0, selected.amount - receivedFor(selected)) : 0;
  const parsed = Number(amount.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed > 0 && Math.round(parsed * 100) <= Math.round(outstanding * 100) && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today();
  const saveReceipt = async () => {
    if (!user || !selected || !valid || saving) return;
    setSaving(true);
    try {
      const { data, error: saveError } = await supabase.from("earnings_bank_receipts").insert({ user_id: user.id, entity_id: selected.entityId, source_key: selected.sourceKey, earning_role: selected.role, currency: selected.currency, amount: Math.round(parsed * 100) / 100, received_at: date }).select("id,entity_id,source_key,earning_role,currency,amount,received_at").single();
      if (saveError) throw saveError;
      setReceipts(previous => [data as Receipt, ...previous]); setSelected(null);
      toast({ title: "Bank receipt recorded" });
    } catch { toast({ title: "Receipt not saved", description: "Try again. Your earnings have not changed.", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const removeReceipt = async (receipt: Receipt) => {
    if (saving || !user) return;
    setSaving(true);
    try {
      const { error: removeError } = await supabase.from("earnings_bank_receipts").delete().eq("id", receipt.id).eq("user_id", user.id);
      if (removeError) throw removeError;
      setReceipts(previous => previous.filter(r => r.id !== receipt.id));
    } catch { toast({ title: "Could not remove receipt", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return <div className="min-h-screen bg-background">
    <Navbar />
    <PageTransition><main className="container mx-auto max-w-6xl px-4 pt-24 pb-16 space-y-6">
      <header className="space-y-2"><h1 className="text-3xl font-bold">Earnings</h1></header>
      <Tabs defaultValue="money" className="space-y-6">
        <TabsList className="h-auto flex flex-wrap justify-start gap-2">
          <TabsTrigger value="money" className="gap-2 py-3"><Banknote className="h-4 w-4" />Money generated</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 py-3"><ClipboardList className="h-4 w-4" />Personal financial audit</TabsTrigger>
        </TabsList>
        <TabsContent value="money" className="space-y-6">
          {loading ? <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-60 w-full" /></div> : error ? <div role="alert" className="space-y-3"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>Retry</Button></div> : <>
            <div className="grid gap-4 sm:grid-cols-3">
              {([['Generated for you', 'generated', Banknote], ['Received in bank account', 'bank', CheckCircle2], ['Awaiting bank receipt', 'awaiting', Clock]] as const).map(([label, key, Icon]) => <Card key={key}><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><div className="mt-3 space-y-1">{Object.entries(totals).length ? Object.entries(totals).map(([currency, total]) => <p className="text-xl font-semibold break-words" key={currency}>{fmt(total[key])} <span className="text-sm text-muted-foreground">{currency}</span></p>) : <p className="text-xl">—</p>}</div></CardContent></Card>)}
            </div>
            <p className="text-xs text-muted-foreground">Per declaration · All recorded periods · Bank receipts are your confirmations, not a live bank balance.</p>
            {groups.length === 0 && <p className="py-8 text-muted-foreground">No personal allocations in your accessible declarations.</p>}
            {groups.map(entity => {
              const items = calculated.items.filter(i => i.entityId === entity.id);
              const org = orgs.find(o => o.id === entity.organization_id);
              const entityReceipts = receipts.filter(r => r.entity_id === entity.id);
              const generated: Record<string, number> = {}, bank: Record<string, number> = {}, due: Record<string, number> = {}, associateProfit: Record<string, number> = {};
              items.forEach(i => { generated[i.currency] = (generated[i.currency] ?? 0) + i.amount; due[i.currency] = (due[i.currency] ?? 0) + Math.max(0, i.amount - receivedFor(i)); if (i.role === "associe") associateProfit[i.currency] = (associateProfit[i.currency] ?? 0) + i.amount; });
              entityReceipts.forEach(r => { bank[r.currency] = (bank[r.currency] ?? 0) + Number(r.amount); });
              return <Card key={entity.id}>
                <CardHeader className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 shrink-0" />{org?.name ?? entity.name}</CardTitle><Button asChild variant="outline" size="sm"><Link to={`/declaration?entity=${entity.id}`}>Open statement</Link></Button></div>
                  <div className="flex flex-wrap gap-2">{[...new Set(items.map(i => i.role))].map(role => <Badge variant="secondary" className="whitespace-normal" key={role}>{roleLabels[role]}</Badge>)}</div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="grid gap-4 sm:grid-cols-3 text-sm">{[["Generated for you", money(generated)], ["Received in bank account", money(bank)], ["Awaiting bank receipt", money(due)]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
                  {calculated.allocation[entity.id] !== undefined && <div className="flex flex-wrap gap-x-6 gap-y-2 border-y py-3 text-xs text-muted-foreground"><span>Configured associate allocation: {fmt(calculated.allocation[entity.id])}%</span><span>Profit in entity: {money(calculated.profit[entity.id] ?? {})}</span><span>Your share of profit: {money(associateProfit)}</span></div>}
                  <div className="divide-y">{items.map(item => {
                    const received = receivedFor(item), pending = Math.max(0, item.amount - received);
                    return <div key={item.sourceKey} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">{item.missionId ? <Link className="text-sm font-medium hover:underline" to={`/declaration?entity=${entity.id}&mission=${item.missionId}`}>{item.title}</Link> : <p className="text-sm font-medium">{item.title}</p>}<p className="text-xs text-muted-foreground">{roleLabels[item.role]} · {item.roleLabel}</p><p className="text-xs text-muted-foreground">Received {fmt(received)} {item.currency} · Awaiting {fmt(pending)} {item.currency}</p></div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end"><p className="text-sm font-semibold">{fmt(item.amount)} {item.currency}</p><Button size="sm" variant={pending < 0.005 ? "secondary" : "outline"} disabled={pending < 0.005 || saving} onClick={() => beginReceipt(item)}><CheckCircle2 className="mr-2 h-4 w-4" />{pending < 0.005 ? "Received" : "Received in my bank account"}</Button></div>
                    </div>;
                  })}</div>
                  {entityReceipts.length > 0 && <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Bank receipt history ({entityReceipts.length})</summary><div className="divide-y mt-2">{entityReceipts.map(receipt => <div key={receipt.id} className="flex items-center justify-between gap-3 py-2 text-xs"><span>{receipt.received_at} · {fmt(Number(receipt.amount))} {receipt.currency} · {roleLabels[receipt.earning_role as keyof typeof roleLabels]}</span><Button variant="ghost" size="icon" disabled={saving} aria-label={`Remove receipt ${receipt.id}`} title="Remove mistaken receipt" onClick={() => removeReceipt(receipt)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></details>}
                </CardContent>
              </Card>;
            })}
          </>}
        </TabsContent>
        <TabsContent value="audit"><FinancialAudit userId={user?.id} /></TabsContent>
      </Tabs>
      <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Received in my bank account</DialogTitle><DialogDescription>{selected?.roleLabel} · {selected?.title}</DialogDescription></DialogHeader><div className="space-y-4"><p className="text-sm text-muted-foreground">Awaiting: {fmt(outstanding)} {selected?.currency}</p><div className="space-y-2"><Label htmlFor="receipt-amount">Amount received ({selected?.currency})</Label><Input id="receipt-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="receipt-date">Date received</Label><Input id="receipt-date" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></div>{!valid && <p className="text-xs text-destructive">Enter an amount above zero, within the awaiting amount, and a date no later than today.</p>}</div><DialogFooter><Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={!valid || saving} onClick={saveReceipt}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm receipt</Button></DialogFooter></DialogContent></Dialog>
    </main></PageTransition><Footer />
  </div>;
}
