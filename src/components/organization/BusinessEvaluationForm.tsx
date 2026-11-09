import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productMaturity, statementSummary, normalizePersonName, type EvaluationAuto } from "@/lib/businessEvaluation";
import { beneficiaryAmount, currencies, evaluationOptions, externalCommunicationOptions, internalCommunicationOptions, numeric, periods, productStages, productTypes, profitFor, sections, systemsOptions, type Evaluation, type Section } from "@/lib/businessEvaluation";

function Choice({ label, value, options, onChange, placeholder = "Select" }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; placeholder?: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-auto min-h-11 w-full min-w-0 gap-2 bg-card text-left text-base font-normal sm:min-h-10 sm:text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option} value={option} className="min-h-11 sm:min-h-8">{option}</SelectItem>)}</SelectContent></Select>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><Label className="text-sm font-semibold text-muted-foreground">{label}</Label>{children}</div>;
}
export function BusinessEvaluationForm({ data, onChange, auto }: { data: Evaluation; onChange: (data: Evaluation) => void; auto?: EvaluationAuto | null }) {
  const [open, setOpen] = useState<Section[]>([]);
  const update = <K extends keyof Evaluation>(key: K, value: Evaluation[K]) => onChange({ ...data, [key]: value });
  const text = (key: "leader" | "teamSize" | "roles" | "decisions" | "tools" | "processes" | "channels" | "registeredName" | "registration" | "legalNotes", label: string, multiline = false, placeholder?: string) => <Field label={label}>{multiline ? <Textarea aria-label={label} rows={3} value={data[key]} placeholder={placeholder} onChange={e => update(key, e.target.value)} className="bg-card" /> : <Input aria-label={label} type={key === "teamSize" ? "number" : "text"} min={key === "teamSize" ? 0 : undefined} value={data[key]} placeholder={placeholder} onChange={e => update(key, e.target.value)} className="bg-card" />}</Field>;
  const [entityId, setEntityId] = useState("");
  const statementEntity = auto?.entities.find(e => e.id === entityId) ?? auto?.entities[0];
  const statementCurrency = data.currency === "EUR" ? "EUR" : "TND";
  const statement = statementEntity && auto ? statementSummary(statementEntity, auto.missions, statementCurrency, auto.associateNames[statementEntity.id]) : null;
  const shippedFor = (name: string) => auto?.products.find(p => normalizePersonName(p.name) === normalizePersonName(name))?.shipped ?? 0;
  const profit = profitFor(data.turnover, data.charges);
  const allocated = data.beneficiaries.reduce((sum, row) => sum + numeric(row.pct), 0);
  const money = (value: number) => `${value.toFixed(2)} ${data.currency}`;
  const remove = (label: string, onClick: () => void) => <Button variant="ghost" size="icon" type="button" aria-label={label} title={label} className="h-11 w-11 bg-muted text-muted-foreground hover:bg-muted sm:h-9 sm:w-9" onClick={onClick}><X /></Button>;
  const content: Record<Section, ReactNode> = {
    Leadership: <><div className="grid gap-4 sm:grid-cols-2">{text("leader", "Leader / responsible person")}{text("teamSize", "Team size")}</div>{text("roles", "Roles and responsibilities", true)}{text("decisions", "How are decisions made?", true)}</>,
    "Products & Services": <>
      <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.4fr)_36px] gap-3 text-xs font-semibold text-muted-foreground sm:grid"><span>Product / service</span><span>Type</span><span>Stage</span><span /></div>
      <div className="divide-y">{data.products.map((product, index) => <div key={product.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-start gap-3 py-4 sm:items-center sm:py-3 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.4fr)_36px]">
        <div className="min-w-0"><Label className="mb-2 block text-xs text-muted-foreground sm:hidden">Product / service</Label><Textarea aria-label={`Product / service ${index + 1}`} rows={2} value={product.name} onChange={e => update("products", data.products.map(row => row.id === product.id ? { ...row, name: e.target.value } : row))} className="resize-y sm:hidden" /><Input aria-label={`Product / service ${index + 1}`} value={product.name} onChange={e => update("products", data.products.map(row => row.id === product.id ? { ...row, name: e.target.value } : row))} className="hidden sm:block" />{(() => { const m = productMaturity(shippedFor(product.name)); return m && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${m.tone === "red" ? "bg-destructive/10 text-destructive" : "bg-evaluation-developing/10 text-evaluation-developing"}`}>{shippedFor(product.name)} shipped · {m.label}</span>; })()}</div>
        <div className="col-span-2 min-w-0 sm:col-span-1"><Label className="mb-2 block text-xs text-muted-foreground sm:hidden">Type</Label><Choice label={`Type ${index + 1}`} value={product.type} options={productTypes} onChange={type => update("products", data.products.map(row => row.id === product.id ? { ...row, type } : row))} /></div>
        <div className="col-span-2 min-w-0 sm:col-span-1"><Label className="mb-2 block text-xs text-muted-foreground sm:hidden">Stage</Label><Choice label={`Stage ${index + 1}`} value={product.stage} options={productStages} onChange={stage => update("products", data.products.map(row => row.id === product.id ? { ...row, stage } : row))} /></div>
        <div className="col-start-2 row-start-1 sm:col-auto sm:row-auto">{remove(`Remove product ${index + 1}`, () => update("products", data.products.filter(row => row.id !== product.id)))}</div>
      </div>)}</div>
      <Button variant="link" className="min-h-11 justify-start px-0 text-sm text-evaluation-link sm:h-auto sm:min-h-0" onClick={() => update("products", [...data.products, { id: crypto.randomUUID(), name: "", type: "", stage: "" }])}><Plus />Add product / service</Button>
    </>,
    Systems: <><div className="grid gap-4 sm:grid-cols-2"><Field label="How are activities managed?"><Choice label="How are activities managed?" value={data.activities} options={systemsOptions} onChange={v => update("activities", v)} /></Field>{text("tools", "Main tools / platforms")}</div>{text("processes", "Key systems and processes", true)}</>,
    Communication: <><div className="grid gap-4 sm:grid-cols-2"><Field label="Internal communication"><Choice label="Internal communication" value={data.internalCommunication} options={internalCommunicationOptions} onChange={v => update("internalCommunication", v)} /></Field><Field label="External communication"><Choice label="External communication" value={data.externalCommunication} options={externalCommunicationOptions} onChange={v => update("externalCommunication", v)} /></Field></div>{text("channels", "Channels / notes", true)}</>,
    Cashflow: <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Period"><Choice label="Period" value={data.period} options={periods} onChange={v => update("period", v)} /></Field><Field label="Currency"><Choice label="Currency" value={data.currency} options={currencies} onChange={v => update("currency", v)} /></Field></div>
      {data.period === "Threshold" ? <div className="space-y-4">
        {!auto ? <p className="text-sm text-muted-foreground">Loading declarations…</p> : auto.entities.length === 0 ? <p className="text-sm text-muted-foreground">No declaration is linked to this organization.</p> : <>
          <Field label="Declaration"><Choice label="Declaration" value={statementEntity?.id ?? ""} options={auto.entities.map(e => e.id)} onChange={setEntityId} /></Field>
          <p className="-mt-2 text-sm text-muted-foreground break-words">{statementEntity?.name} · {statementCurrency} statement{data.currency === "USD" ? " (USD not declared — showing TND)" : ""}</p>
          {statement && <><div className="grid gap-4 sm:grid-cols-3">
            <Field label="Turnover"><Input aria-label="Turnover" value={statement.turnover.toFixed(2)} readOnly /></Field>
            <Field label="Charges / expenses"><Input aria-label="Charges / expenses" value={statement.charges.toFixed(2)} readOnly /></Field>
            <Field label="Profit"><Input aria-label="Profit" value={statement.profit.toFixed(2)} readOnly /></Field>
          </div>
          <div className="space-y-2"><h3 className="font-semibold">How is profit distributed?</h3>{statement.rows.map(row => <div key={row.name} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"><span className="min-w-0 break-words">{row.name}</span><span className="font-semibold tabular-nums">{row.pct}% · {row.amount.toFixed(2)} {statementCurrency}</span></div>)}</div>
          <p className="text-xs text-muted-foreground">Taken from the organization statement. Read-only here.</p></>}
        </>}
      </div> : <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Turnover"><Input aria-label="Turnover" inputMode="decimal" value={data.turnover} onChange={e => update("turnover", e.target.value)} /></Field>
        <Field label="Charges / expenses"><Input aria-label="Charges / expenses" inputMode="decimal" value={data.charges} onChange={e => update("charges", e.target.value)} /></Field>
        <Field label="Profit"><Input aria-label="Profit" value={profit.toFixed(2)} readOnly /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-evaluation-success/10 p-4"><span>Profit = Turnover − Charges</span><strong className={profit < 0 ? "text-destructive" : "text-evaluation-success"}>{money(profit)}</strong></div>
      <div className="space-y-3"><h3 className="font-semibold">How is profit distributed?</h3>{data.beneficiaries.map((row, index) => <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_44px] gap-3 border-b pb-4 sm:gap-2 sm:border-0 sm:pb-0 sm:grid-cols-[minmax(0,1fr)_100px_140px_36px]">
        <Input aria-label={`Beneficiary ${index + 1}`} value={row.name} onChange={e => update("beneficiaries", data.beneficiaries.map(b => b.id === row.id ? { ...b, name: e.target.value } : b))} />
        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 sm:contents"><div className="min-w-0"><Label className="mb-2 block text-xs text-muted-foreground sm:hidden">Share (%)</Label><Input aria-label={`Beneficiary percentage ${index + 1}`} type="number" inputMode="decimal" min={0} max={100} step="0.01" value={row.pct} onChange={e => update("beneficiaries", data.beneficiaries.map(b => b.id === row.id ? { ...b, pct: e.target.value } : b))} /></div><div className="min-w-0"><Label className="mb-2 block text-xs text-muted-foreground sm:hidden">Amount</Label><Input aria-label={`Beneficiary amount ${index + 1}`} value={money(beneficiaryAmount(profit, row.pct))} readOnly /></div></div>
        <div className="col-start-2 row-start-1 sm:col-auto sm:row-auto">{remove(`Remove beneficiary ${index + 1}`, () => update("beneficiaries", data.beneficiaries.filter(b => b.id !== row.id)))}</div>
      </div>)}<Button variant="link" className="min-h-11 px-0 text-evaluation-link sm:h-auto sm:min-h-0" onClick={() => update("beneficiaries", [...data.beneficiaries, { id: crypto.randomUUID(), name: "", pct: "" }])}><Plus />Add beneficiary</Button><p className={allocated > 100 ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>Distribution allocated: {Math.round(allocated * 100) / 100}% — {allocated === 100 ? "fully allocated" : allocated > 100 ? "overallocated" : `${Math.round((100 - allocated) * 100) / 100}% unallocated`}</p></div>
    </>}</>,
    Legal: <>
      <Field label="Legal form"><RadioGroup value={data.legalForm} onValueChange={v => update("legalForm", v)} className="grid gap-3 md:grid-cols-3">{[["Solo incorporated", "One owner, incorporated entity"], ["Unincorporated partnership", "Partners without a separate incorporated entity"], ["Incorporated partnership", "A company formed by partners"]].map(([value, description]) => <Label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${data.legalForm === value ? "border-evaluation-link bg-evaluation-link/5" : "border-border"}`}><RadioGroupItem value={value} className="mt-0.5 shrink-0" /><span className="min-w-0"><span className="block font-semibold text-muted-foreground">{value}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span></span></Label>)}</RadioGroup></Field>
      <div className="grid gap-4 sm:grid-cols-2">{text("registeredName", "Registered name")}{text("registration", "Registration / ID", false, "Optional")}</div>{text("legalNotes", "Partners, ownership and legal notes", true, "Partners, shares, agreements, registration status")}
    </>,
  };
  return <div className="overflow-hidden rounded-xl border bg-card text-card-foreground divide-y sm:rounded-2xl [&_input]:min-w-0 [&_input]:min-h-11 [&_input]:text-base sm:[&_input]:min-h-10 sm:[&_input]:text-sm [&_textarea]:text-base sm:[&_textarea]:text-sm">{sections.map(section => {
    const expanded = open.includes(section), evaluation = data.evaluations[section];
    const statusClass = evaluation === "Developing" ? "bg-evaluation-developing/10 text-evaluation-developing" : evaluation === "Established" || evaluation === "Structured" ? "bg-evaluation-success/10 text-evaluation-success" : "bg-muted text-muted-foreground";
    return <section key={section}>
      <h2><Button variant="ghost" className="flex h-auto min-h-16 w-full justify-between gap-2 whitespace-normal rounded-none px-4 py-4 text-left text-sm hover:bg-muted/30 hover:text-foreground sm:gap-4 sm:px-5 sm:text-base" aria-expanded={expanded} aria-controls={`evaluation-${section}`} onClick={() => setOpen(previous => expanded ? previous.filter(s => s !== section) : [...previous, section])}><span className="min-w-0 break-words">{section}</span><span className="flex max-w-[52%] shrink-0 items-center gap-2 sm:gap-3"><span className={`rounded-full px-2 py-1 text-center text-xs font-semibold sm:px-3 ${statusClass}`}>{evaluation || "Choose evaluation"}</span><ChevronDown className={`text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} /></span></Button></h2>
      {expanded && <div id={`evaluation-${section}`} className="scroll-mt-20 space-y-5 border-t px-4 py-5 sm:px-5">{content[section]}<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Label className="font-semibold text-muted-foreground">{section === "Products & Services" ? "Products" : section} evaluation</Label><div className="w-full sm:w-56"><Choice label={`${section} evaluation`} value={evaluation} options={evaluationOptions} placeholder="Choose evaluation" onChange={value => update("evaluations", { ...data.evaluations, [section]: value })} /></div></div></div>}
    </section>;
  })}</div>;
}