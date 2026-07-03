import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Opportunity {
  id: string;
  title: string;
  client_name: string | null;
  source: string;
  number_of_days: number | null;
  amount_per_day: number | null;
  total_amount: number | null;
  currency: string | null;
  is_completed: boolean;
  completed_at: string | null;
  offer_date: string | null;
}

const SOURCES = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TENDER", label: "Tender / Platform" },
  { value: "REFERRAL", label: "Referral" },
  { value: "RETURNING_CLIENT", label: "Returning client" },
  { value: "DIRECT", label: "Direct outreach" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
];

const MILESTONE = 10;
const DRAFT_KEY = "consulting-growth:new-opp-draft";
const OPEN_KEY = "consulting-growth:new-opp-open";

const EMPTY_FORM = {
  title: "",
  client_name: "",
  source: "LINKEDIN",
  description: "",
  number_of_days: "",
  amount_per_day: "",
  currency: "EUR",
};

export default function ConsultingGrowth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? { ...EMPTY_FORM, ...JSON.parse(raw) } : EMPTY_FORM;
    } catch { return EMPTY_FORM; }
  });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form]);

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, dialogOpen ? "1" : "0"); } catch {}
  }, [dialogOpen]);


  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("consultant_opportunities")
      .select("id,title,client_name,source,number_of_days,amount_per_day,total_amount,currency,is_completed,completed_at,offer_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const days = form.number_of_days ? parseInt(form.number_of_days) : null;
    const perDay = form.amount_per_day ? parseFloat(form.amount_per_day) : null;
    const total = days && perDay ? days * perDay : null;
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      client_name: form.client_name.trim() || null,
      source: form.source,
      description: form.description.trim() || null,
      number_of_days: days,
      amount_per_day: perDay,
      total_amount: total,
      currency: form.currency,
      offer_date: new Date().toISOString().slice(0, 10),
    } as never;
    const { error } = await supabase.from("consultant_opportunities").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity added" });
    setDialogOpen(false);
    setForm({ title: "", client_name: "", source: "LINKEDIN", description: "", number_of_days: "", amount_per_day: "", currency: "EUR" });
    load();
  };

  const markPaid = async (opp: Opportunity) => {
    const { error } = await supabase
      .from("consultant_opportunities")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", opp.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as paid" });
    load();
  };

  const paid = items.filter(i => i.is_completed);
  const pipeline = items.filter(i => !i.is_completed);
  const totalRevenue = paid.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const avgDaily = paid.filter(i => i.number_of_days && i.amount_per_day).reduce((s, i, _, arr) => s + Number(i.amount_per_day) / arr.length, 0);
  const activeClients = new Set(paid.map(i => i.client_name).filter(Boolean)).size;
  const milestonePct = Math.min(100, (paid.length / MILESTONE) * 100);

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Consulting Growth</h1>
          <p className="text-muted-foreground mt-1">Track opportunities, delivery, and revenue toward your brand launch.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="teal"><Plus className="w-4 h-4 mr-2" />New opportunity</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New consulting opportunity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Digital Security Training – Bank X" /></div>
              <div><Label>Client name</Label><Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} /></div>
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Days</Label><Input type="number" value={form.number_of_days} onChange={e => setForm({ ...form, number_of_days: e.target.value })} /></div>
                <div><Label>Per day</Label><Input type="number" value={form.amount_per_day} onChange={e => setForm({ ...form, amount_per_day: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} maxLength={3} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <Button onClick={create} disabled={saving} className="w-full">{saving ? "Saving…" : "Add opportunity"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Briefcase className="w-4 h-4" />Pipeline</div><div className="text-2xl font-bold">{pipeline.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CheckCircle2 className="w-4 h-4" />Paid missions</div><div className="text-2xl font-bold">{paid.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><DollarSign className="w-4 h-4" />Total revenue</div><div className="text-2xl font-bold">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">EUR</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp className="w-4 h-4" />Active clients</div><div className="text-2xl font-bold">{activeClients}</div></CardContent></Card>
      </div>

      {/* Milestone */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Brand entity unlock</CardTitle>
              <CardDescription>Reach {MILESTONE} paid missions to launch your own brand</CardDescription>
            </div>
            <Badge variant={paid.length >= MILESTONE ? "default" : "outline"}>{paid.length}/{MILESTONE}</Badge>
          </div>
        </CardHeader>
        <CardContent><Progress value={milestonePct} /></CardContent>
      </Card>

      {/* Pipeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline</CardTitle><CardDescription>Opportunities not yet paid</CardDescription></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            pipeline.length === 0 ? <p className="text-sm text-muted-foreground">Nothing in pipeline. Add your first opportunity above.</p> :
            <div className="space-y-2">
              {pipeline.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                      <span>{o.client_name || "—"}</span>
                      <Badge variant="outline" className="text-[10px]">{o.source}</Badge>
                      {o.total_amount && <span>{Number(o.total_amount).toLocaleString()} {o.currency}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => markPaid(o)}>Mark paid</Button>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      {/* Accounting */}
      <Card>
        <CardHeader><CardTitle className="text-base">Accounting</CardTitle><CardDescription>Paid missions declared as revenue</CardDescription></CardHeader>
        <CardContent>
          {paid.length === 0 ? <p className="text-sm text-muted-foreground">No paid missions yet.</p> :
            <div className="space-y-2">
              {paid.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.client_name || "—"} · paid {o.completed_at ? format(new Date(o.completed_at), "MMM d, yyyy") : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(o.total_amount ?? 0).toLocaleString()} {o.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
