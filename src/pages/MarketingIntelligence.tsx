import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronRight, ExternalLink, Loader2, Pencil, Printer, RefreshCw, Sparkles, X } from "lucide-react";
import {
  OFFER_KIND_LABEL, SECTION_COPY, emptyContent, normalizeContent, researchLinks,
  type AnalysisContent, type OfferKind,
} from "@/lib/marketingIntelligence";

type Row = { id: string; title: string; offer_kind: OfferKind; content: unknown; generated_at: string | null; organization_id: string };

async function invokeAI(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("marketing-intelligence", { body });
  if (error) {
    let msg = error.message;
    try { const t = await (error as any).context?.json?.(); if (t?.error) msg = t.error; } catch { /* keep message */ }
    throw new Error(msg);
  }
  return data;
}

function EditableCell({ value, onSave, onRegenerate, multiline = true, className = "" }: {
  value: string; onSave: (v: string) => void; onRegenerate?: () => Promise<string>; multiline?: boolean; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => setDraft(value), [value]);
  if (editing) {
    return (
      <div className="flex items-start gap-1">
        {multiline ? (
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[60px] text-sm" autoFocus />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 text-sm" autoFocus />
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { onSave(draft); setEditing(false); }} title="Save"><Check className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setDraft(value); setEditing(false); }} title="Cancel"><X className="w-4 h-4" /></Button>
      </div>
    );
  }
  return (
    <div className={`group flex items-start gap-1 ${className}`}>
      <span className="flex-1 min-w-0 break-words">{value || <span className="text-muted-foreground italic">Empty</span>}</span>
      <span className="flex shrink-0 gap-0.5 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity print:hidden">
        <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setEditing(true)} title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
        {onRegenerate && (
          <button type="button" className="p-1 rounded hover:bg-muted" disabled={busy} title="Regenerate with AI"
            onClick={async () => {
              setBusy(true);
              try { onSave(await onRegenerate()); } catch (e: any) { toast({ title: "AI failed", description: e.message, variant: "destructive" }); }
              finally { setBusy(false); }
            }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
        )}
      </span>
    </div>
  );
}

function Section({ n, title, desc, children }: { n: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 break-inside-avoid">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 text-primary font-semibold text-sm px-2.5 py-1.5">{n}</span>
        <div>
          <h2 className="font-semibold text-lg text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="bg-muted/50">
          <tr>{head.map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-foreground px-3 py-2.5">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function Callout({ label, text, onSave }: { label: string; text: string; onSave: (v: string) => void }) {
  return (
    <div className="rounded-lg border-l-4 border-accent bg-accent/10 p-3 text-sm">
      <span className="font-semibold text-foreground">{label}: </span>
      <EditableCell value={text} onSave={onSave} className="inline-flex w-full" />
    </div>
  );
}

export default function MarketingIntelligence() {
  const { slug, analysisId } = useParams();
  const { toast } = useToast();
  const [row, setRow] = useState<Row | null>(null);
  const [content, setContent] = useState<AnalysisContent>(emptyContent());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const saveTimer = useRef<number>();
  const autoStarted = useRef(false);

  const generate = useCallback(async () => {
    if (!analysisId) return;
    setGenerating(true);
    try {
      const data = await invokeAI({ analysisId, mode: "full" });
      setContent(normalizeContent(data?.content));
      setRow((r) => (r ? { ...r, generated_at: new Date().toISOString() } : r));
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  }, [analysisId, toast]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("product_marketing_analyses").select("*").eq("id", analysisId!).maybeSingle();
      setRow(data as Row | null);
      if (data) { setContent(normalizeContent(data.content)); setTitleDraft(data.title); }
      setLoading(false);
      if (data && !data.generated_at && !autoStarted.current) { autoStarted.current = true; generate(); }
    })();
  }, [analysisId, generate]);

  const persist = (next: AnalysisContent) => {
    setContent(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("product_marketing_analyses")
        .update({ content: next as any, updated_at: new Date().toISOString() }).eq("id", analysisId!);
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }, 500);
  };

  const setField = <K extends keyof AnalysisContent>(k: K, v: AnalysisContent[K]) => persist({ ...content, [k]: v });
  const setRowField = (k: "identification" | "addedValue" | "priorities" | "validation" | "checklist" | "marketSignals", i: number, f: string, v: unknown) => {
    const list = [...(content[k] as any[])];
    list[i] = { ...list[i], [f]: v };
    persist({ ...content, [k]: list });
  };
  const regen = (section: string, field: string, r: unknown) => async () => {
    const data = await invokeAI({ analysisId, mode: "cell", section, field, row: r });
    return String(data?.value ?? "");
  };

  const saveTitle = async () => {
    const t = titleDraft.trim();
    if (!t) return;
    const { error } = await supabase.from("product_marketing_analyses").update({ title: t }).eq("id", analysisId!);
    if (error) return toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    setRow((r) => (r ? { ...r, title: t } : r));
    setEditingTitle(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!row) return <div className="p-10 text-center text-muted-foreground">Analysis not found or you don't have access.</div>;

  const kind = row.offer_kind;
  const copy = SECTION_COPY[kind];
  const links = researchLinks(kind, row.title);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      <Link to={`/org/${slug}?tab=product`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">Lead · Intelligence framework</p>
        <h1 className="text-2xl sm:text-4xl font-bold mt-2">Analysis & Marketing Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base opacity-90">
          A structured process to identify an offer, understand its audience, validate its real capabilities, and translate supported value into testable marketing angles.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {["Identification", "Competitive research", "Founder / provider validation", "Marketing prioritization"].map((t) => (
            <span key={t} className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs">{t}</span>
          ))}
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">{OFFER_KIND_LABEL[kind]}</p>
          {editingTitle ? (
            <div className="flex items-center gap-1 mt-1">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveTitle()} className="h-9 max-w-md" autoFocus />
              <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditingTitle(false); setTitleDraft(row.title); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-2xl font-bold text-foreground break-words">{row.title}</h2>
              <Button size="icon" variant="ghost" className="h-8 w-8 print:hidden" onClick={() => setEditingTitle(true)} title="Rename this page only (product name stays unchanged)">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {content.subtitle || `${copy.offerWord} identification, functional validation and added-value analysis.`}
            {content.researchedOn && <span className="ml-2">· Researched {content.researchedOn}</span>}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Refresh with latest research
          </Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print / PDF</Button>
        </div>
      </div>

      {generating && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Researching current market data and building the analysis. This can take up to a minute.
        </div>
      )}

      <Section n="01" title={`${copy.offerWord} identification`} desc={`Understand what the ${copy.offerWord.toLowerCase()} is, who it serves and how it works.`}>
        <h3 className="font-semibold text-sm text-foreground">Information to collect from the {kind === "service" ? "provider" : "founder"}</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {content.checklist.map((c, i) => (
            <label key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <input type="checkbox" className="mt-1" checked={!!c.done} onChange={(e) => setRowField("checklist", i, "done", e.target.checked)} />
              <div className="flex-1 min-w-0 text-sm">
                <EditableCell value={c.label} onSave={(v) => setRowField("checklist", i, "label", v)} multiline={false} className="font-semibold" />
                <EditableCell value={c.desc} onSave={(v) => setRowField("checklist", i, "desc", v)} className="text-muted-foreground" />
              </div>
            </label>
          ))}
        </div>
        <h3 className="font-semibold text-sm text-foreground">{copy.offerWord} identification elements</h3>
        <Table head={["ID", "Element", "Information to establish"]}>
          {content.identification.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 align-top text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5 align-top w-1/4"><EditableCell value={r.element} onSave={(v) => setRowField("identification", i, "element", v)} multiline={false} /></td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.info} onSave={(v) => setRowField("identification", i, "info", v)} onRegenerate={regen("identification", "info", r)} /></td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section n="02" title={copy.research} desc={copy.researchDesc}>
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5">
              {l.label} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
        {content.researchNote && <div className="text-sm text-muted-foreground"><EditableCell value={content.researchNote} onSave={(v) => setField("researchNote", v)} /></div>}
        {content.marketSignals.length > 0 && (
          <>
            <h3 className="font-semibold text-sm text-foreground">Current market signals{content.researchedOn ? ` (as of ${content.researchedOn})` : ""}</h3>
            <Table head={["Signal", "Insight", "Source"]}>
              {content.marketSignals.map((m, i) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 align-top w-1/4 font-medium"><EditableCell value={m.headline} onSave={(v) => setRowField("marketSignals", i, "headline", v)} /></td>
                  <td className="px-3 py-2.5 align-top"><EditableCell value={m.insight} onSave={(v) => setRowField("marketSignals", i, "insight", v)} onRegenerate={regen("marketSignals", "insight", m)} /></td>
                  <td className="px-3 py-2.5 align-top w-1/5 text-muted-foreground break-all">
                    {/^https?:\/\//.test(m.source || "") ? <a href={m.source} target="_blank" rel="noopener noreferrer" className="text-primary underline">Link</a> : m.source}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
        {content.principle && <Callout label="Identification principle" text={content.principle} onSave={(v) => setField("principle", v)} />}
      </Section>

      <Section n="03" title="Added value analysis" desc={`Translate possible ${copy.offerWord.toLowerCase()} capabilities into customer benefits and pain-point solutions.`}>
        <div className="rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground">Target avatar</h3>
          <div className="text-sm text-muted-foreground mt-1"><EditableCell value={content.avatar || ""} onSave={(v) => setField("avatar", v)} /></div>
        </div>
        <Table head={["ID", "Marketing angle", "Potential added value", "Customer pain point"]}>
          {content.addedValue.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 align-top text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.angle} onSave={(v) => setRowField("addedValue", i, "angle", v)} multiline={false} /></td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.value} onSave={(v) => setRowField("addedValue", i, "value", v)} onRegenerate={regen("addedValue", "value", r)} /></td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.pain} onSave={(v) => setRowField("addedValue", i, "pain", v)} onRegenerate={regen("addedValue", "pain", r)} /></td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section n="04" title="Priority marketing angles" desc="Initial order for advertising tests — subject to functional validation.">
        <Table head={["Priority", "Angle", "Proposed advertising message"]}>
          {content.priorities.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 align-top"><span className="inline-flex h-6 w-6 items-center justify-center rounded bg-secondary text-secondary-foreground text-xs font-semibold">{i + 1}</span></td>
              <td className="px-3 py-2.5 align-top font-semibold"><EditableCell value={r.angle} onSave={(v) => setRowField("priorities", i, "angle", v)} multiline={false} /></td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.message} onSave={(v) => setRowField("priorities", i, "message", v)} onRegenerate={regen("priorities", "message", r)} /></td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section n="05" title={`${kind === "service" ? "Provider" : "Founder"} functional validation gate`} desc={`A marketing angle becomes an advertising claim only when the ${copy.offerWord.toLowerCase()} supports it.`}>
        <Table head={["Marketing angle", copy.validationCol, "Validation"]}>
          {content.validation.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.angle} onSave={(v) => setRowField("validation", i, "angle", v)} multiline={false} /></td>
              <td className="px-3 py-2.5 align-top"><EditableCell value={r.functionality} onSave={(v) => setRowField("validation", i, "functionality", v)} onRegenerate={regen("validation", "functionality", r)} /></td>
              <td className="px-3 py-2.5 align-top">
                <select value={r.status} onChange={(e) => setRowField("validation", i, "status", e.target.value)}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold">
                  {["To confirm", "Confirmed", "Not supported"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </Table>
        {content.rule && <Callout label="Rule" text={content.rule} onSave={(v) => setField("rule", v)} />}
      </Section>

      <Section n="06" title="Complete LEAD workflow" desc="From founder input to an advertising-ready brief.">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {content.workflow.map((w, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className="w-36 rounded-lg border border-border bg-muted/30 p-3 text-center text-xs font-semibold">{w}</div>
              {i < content.workflow.length - 1 && <ChevronRight className="w-4 h-4 text-primary" />}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 text-center">
          <Badge variant="secondary" className="mb-2">Deliverable</Badge>
          <h3 className="text-lg font-bold">{content.deliverableTitle || `${copy.offerWord} Identification + Validated Marketing Strategy`}</h3>
          <p className="text-sm opacity-90 mt-1">{content.deliverableItems}</p>
        </div>
      </Section>
    </div>
  );
}
