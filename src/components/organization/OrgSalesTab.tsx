import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, FileDown, Plus, Trash2, Archive } from "lucide-react";
import { FUNNEL_GATES, STAGE_LABEL, computeStage, isArchived, type SalesStatus } from "@/lib/salesFunnel";
import { exportSalesDocPdf, type SalesDocLine } from "@/lib/salesPdfExport";

type Kind = "service_proposal" | "product_file";
interface SalesDoc {
  id: string; kind: Kind; title: string; linked_item: string; client_name: string; doc_date: string;
  technical_content: string; financial_items: SalesDocLine[]; currency: string; notes: string;
}
interface SalesOpp {
  id: string; client_name: string; client_title: string; channel: string;
  checks: Record<string, boolean>; status: SalesStatus; notes: string;
}

interface Props {
  orgId: string; orgName: string; logoPath: string | null; canAdmin: boolean;
  serviceBased: boolean; productBased: boolean;
  onModesChange: (m: { serviceBased: boolean; productBased: boolean }) => void;
}

const db = supabase as any;
const STATUS_LABEL: Record<SalesStatus, string> = { in_negotiation: "In negotiation", delivered: "Delivered", no_answer: "No answer" };

export function OrgSalesTab({ orgId, orgName, logoPath, canAdmin, serviceBased, productBased, onModesChange }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<SalesDoc[]>([]);
  const [opps, setOpps] = useState<SalesOpp[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [openOpps, setOpenOpps] = useState<Set<string>>(new Set());
  const toggleOpp = (id: string) => setOpenOpps((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });


  const load = useCallback(async () => {
    const [d, o, p] = await Promise.all([
      db.from("org_sales_documents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      db.from("org_sales_opportunities").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      db.from("organization_products").select("name").eq("organization_id", orgId).is("archived_at", null),
    ]);
    setDocs(d.data ?? []); setOpps(o.data ?? []);
    setProducts(((p.data ?? []) as any[]).map((x) => x.name));
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const setMode = async (key: "sales_service_based" | "sales_product_based", v: boolean) => {
    const next = { serviceBased, productBased, [key === "sales_service_based" ? "serviceBased" : "productBased"]: v };
    const { error } = await db.from("organizations").update({ [key]: v }).eq("id", orgId);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    onModesChange(next);
  };

  const addDoc = async (kind: Kind) => {
    const { data, error } = await db.from("org_sales_documents").insert({
      organization_id: orgId, kind, title: kind === "service_proposal" ? "New proposal" : "New product file",
      financial_items: [{ label: "", qty: 1, unit_price: 0 }],
    }).select().single();
    if (error) return toast({ title: "Could not create", description: error.message, variant: "destructive" });
    setDocs((x) => [data, ...x]); setOpenDoc(data.id);
  };
  const patchDoc = (id: string, patch: Partial<SalesDoc>) => setDocs((x) => x.map((d) => d.id === id ? { ...d, ...patch } : d));
  const saveDoc = async (d: SalesDoc) => {
    const { error } = await db.from("org_sales_documents").update({
      title: d.title, linked_item: d.linked_item, client_name: d.client_name, doc_date: d.doc_date,
      technical_content: d.technical_content, financial_items: d.financial_items, currency: d.currency, notes: d.notes,
      updated_at: new Date().toISOString(),
    }).eq("id", d.id);
    toast(error ? { title: "Save failed", description: error.message, variant: "destructive" } : { title: "Saved" });
  };
  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await db.from("org_sales_documents").delete().eq("id", id);
    setDocs((x) => x.filter((d) => d.id !== id));
  };

  const addOpp = async () => {
    const { data, error } = await db.from("org_sales_opportunities").insert({ organization_id: orgId }).select().single();
    if (error) return toast({ title: "Could not add", description: error.message, variant: "destructive" });
    setOpps((x) => [data, ...x]);
  };
  const updateOpp = async (id: string, patch: Partial<SalesOpp>) => {
    setOpps((x) => x.map((o) => o.id === id ? { ...o, ...patch } : o));
    await db.from("org_sales_opportunities").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  };
  const deleteOpp = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    await db.from("org_sales_opportunities").delete().eq("id", id);
    setOpps((x) => x.filter((o) => o.id !== id));
  };

  const active = opps.filter((o) => !isArchived(o.status));
  const archived = opps.filter((o) => isArchived(o.status));
  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { traffic: 0, lead: 0, mql: 0, sql: 0, client: 0 };
    active.forEach((o) => { c[computeStage(o.checks)]++; });
    return c;
  }, [active]);

  const renderDocs = (kind: Kind) => {
    const list = docs.filter((d) => d.kind === kind);
    const isService = kind === "service_proposal";
    return (
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold">{isService ? "Technical & financial proposals" : "Product technical & financial files"}</h3>
            <p className="text-xs text-muted-foreground">{isService ? "Service-based offers, exported as PDF with the organization logo." : "Product sale files, exported as PDF with the organization logo."}</p>
          </div>
          {canAdmin && <Button size="sm" onClick={() => addDoc(kind)}><Plus className="w-4 h-4 mr-1" />{isService ? "New proposal" : "New product file"}</Button>}
        </div>
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing drafted yet.</p>}
        {list.map((d) => {
          const open = openDoc === d.id;
          const total = d.financial_items.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
          return (
            <div key={d.id} className="rounded-lg border">
              <button type="button" onClick={() => setOpenDoc(open ? null : d.id)} className="w-full flex items-center gap-2 p-3 text-left">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium flex-1 truncate">{d.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground">{d.client_name || "No client"} · {total.toLocaleString("fr-FR")} {d.currency}</span>
              </button>
              {open && (
                <div className="border-t p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div><Label className="text-xs">Title</Label><Input disabled={!canAdmin} value={d.title} onChange={(e) => patchDoc(d.id, { title: e.target.value })} /></div>
                    <div>
                      <Label className="text-xs">{isService ? "Type of linked service" : "Product"}</Label>
                      <Input disabled={!canAdmin} list={`sales-items-${orgId}`} value={d.linked_item} onChange={(e) => patchDoc(d.id, { linked_item: e.target.value })} />
                    </div>
                    <div><Label className="text-xs">Client</Label><Input disabled={!canAdmin} value={d.client_name} onChange={(e) => patchDoc(d.id, { client_name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Firm</Label><Input value={orgName} disabled /></div>
                      <div><Label className="text-xs">Date</Label><Input type="date" disabled={!canAdmin} value={d.doc_date} onChange={(e) => patchDoc(d.id, { doc_date: e.target.value })} /></div>
                    </div>
                  </div>
                  <div><Label className="text-xs">Technical content</Label>
                    <Textarea disabled={!canAdmin} rows={6} value={d.technical_content} onChange={(e) => patchDoc(d.id, { technical_content: e.target.value })} placeholder="Scope, methodology, deliverables, timeline..." />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Financial items</Label>
                      <Input disabled={!canAdmin} className="h-7 w-20 text-xs" value={d.currency} onChange={(e) => patchDoc(d.id, { currency: e.target.value })} />
                    </div>
                    {d.financial_items.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_70px_110px_32px] gap-2">
                        <Input disabled={!canAdmin} placeholder="Item" value={l.label} onChange={(e) => patchDoc(d.id, { financial_items: d.financial_items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                        <Input disabled={!canAdmin} type="number" value={l.qty} onChange={(e) => patchDoc(d.id, { financial_items: d.financial_items.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x) })} />
                        <Input disabled={!canAdmin} type="number" value={l.unit_price} onChange={(e) => patchDoc(d.id, { financial_items: d.financial_items.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) } : x) })} />
                        {canAdmin && <Button size="icon" variant="ghost" onClick={() => patchDoc(d.id, { financial_items: d.financial_items.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                    {canAdmin && <Button size="sm" variant="outline" onClick={() => patchDoc(d.id, { financial_items: [...d.financial_items, { label: "", qty: 1, unit_price: 0 }] })}><Plus className="w-3 h-3 mr-1" />Add item</Button>}
                    <p className="text-sm font-semibold text-right">Total: {total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {d.currency}</p>
                  </div>
                  <div><Label className="text-xs">Notes / terms</Label><Textarea disabled={!canAdmin} rows={2} value={d.notes} onChange={(e) => patchDoc(d.id, { notes: e.target.value })} /></div>
                  <div className="flex gap-2 justify-end flex-wrap">
                    {canAdmin && <Button size="sm" variant="ghost" onClick={() => deleteDoc(d.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
                    {canAdmin && <Button size="sm" variant="outline" onClick={() => saveDoc(d)}>Save</Button>}
                    <Button size="sm" onClick={() => exportSalesDocPdf({
                      kind: d.kind, title: d.title, linkedItem: d.linked_item, clientName: d.client_name, firmName: orgName,
                      date: d.doc_date, technical: d.technical_content, lines: d.financial_items, currency: d.currency, notes: d.notes, logoPath,
                    })}><FileDown className="w-4 h-4 mr-1" />Export PDF</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  };

  const renderOpp = (o: SalesOpp) => {
    const stage = computeStage(o.checks);
    const open = openOpps.has(o.id);
    return (
      <div key={o.id} className="rounded-lg border">
        <button type="button" onClick={() => toggleOpp(o.id)} className="w-full flex items-center gap-2 p-3 text-left">
          {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <span className="font-medium flex-1 truncate">{o.client_name || "Unnamed client"}</span>
          {o.client_title && <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[220px]">{o.client_title}</span>}
          <Badge variant="outline" className="shrink-0">{STAGE_LABEL[stage]}</Badge>
          <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">{STATUS_LABEL[o.status]}</span>
        </button>
        {open && (
          <div className="border-t p-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_140px_160px_auto] items-end">
              <div><Label className="text-xs">Client</Label><Input disabled={!canAdmin} defaultValue={o.client_name} onBlur={(e) => updateOpp(o.id, { client_name: e.target.value })} /></div>
              <div><Label className="text-xs">Title of the client</Label><Input disabled={!canAdmin} defaultValue={o.client_title} onBlur={(e) => updateOpp(o.id, { client_title: e.target.value })} /></div>
              <div><Label className="text-xs">Channel</Label>
                <Select disabled={!canAdmin} value={o.channel} onValueChange={(v) => updateOpp(o.id, { channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="wom">Word of mouth</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select disabled={!canAdmin} value={o.status} onValueChange={(v) => updateOpp(o.id, { status: v as SalesStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{STAGE_LABEL[stage]}</Badge>
                {canAdmin && <Button size="icon" variant="ghost" onClick={() => deleteOpp(o.id)}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {FUNNEL_GATES.map((g, gi) => {
                const prevDone = gi === 0 || FUNNEL_GATES.slice(0, gi).every((pg) => pg.checks.every((c) => o.checks?.[c.key]));
                return (
                  <div key={g.to} className={`rounded-md border p-2 space-y-1 ${prevDone ? "" : "opacity-50"}`}>
                    <p className="text-xs font-semibold">→ {g.label}</p>
                    {g.checks.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-xs">
                        <Checkbox disabled={!canAdmin || !prevDone} checked={!!o.checks?.[c.key]}
                          onCheckedChange={(v) => updateOpp(o.id, { checks: { ...o.checks, [c.key]: !!v } })} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="space-y-4">
      <datalist id={`sales-items-${orgId}`}>{products.map((p) => <option key={p} value={p} />)}</datalist>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold mb-2">Organization type</h3>
        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-sm"><Checkbox disabled={!canAdmin} checked={serviceBased} onCheckedChange={(v) => setMode("sales_service_based", !!v)} />Service based</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox disabled={!canAdmin} checked={productBased} onCheckedChange={(v) => setMode("sales_product_based", !!v)} />Product based</label>
        </div>
        {!serviceBased && !productBased && <p className="text-xs text-muted-foreground mt-2">Check at least one type to start drafting proposals.</p>}
      </section>

      {serviceBased && renderDocs("service_proposal")}
      {productBased && renderDocs("product_file")}

      {(serviceBased || productBased) && (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold">Sales opportunities</h3>
              <p className="text-xs text-muted-foreground">Every opportunity starts as Traffic. 3 checks move it to the next stage. "No answer" sends it to archive.</p>
            </div>
            {canAdmin && <Button size="sm" onClick={addOpp}><Plus className="w-4 h-4 mr-1" />Add opportunity</Button>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["traffic", "lead", "mql", "sql", "client"] as const).map((s) => (
              <Badge key={s} variant="outline">{STAGE_LABEL[s]}: {stageCounts[s]}</Badge>
            ))}
          </div>
          {active.length === 0 && <p className="text-sm text-muted-foreground">No active opportunities.</p>}
          {active.map(renderOpp)}
          {archived.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowArchive((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Archive className="w-4 h-4" />Archive ({archived.length}) {showArchive ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showArchive && <div className="mt-2 space-y-2">{archived.map(renderOpp)}</div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
