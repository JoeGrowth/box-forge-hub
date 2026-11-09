import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { beneficiaryAmount, currencies, evaluationOptions, externalCommunicationOptions, internalCommunicationOptions, numeric, periods, productStages, productTypes, profitFor, sections, systemsOptions, type Evaluation, type Section } from "@/lib/businessEvaluation";

function Choice({ label, value, options, onChange, placeholder = "Select" }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; placeholder?: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-10 w-full bg-card font-normal"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><Label className="text-sm font-semibold text-muted-foreground">{label}</Label>{children}</div>;
}
export function BusinessEvaluationForm({ data, onChange }: { data: Evaluation; onChange: (data: Evaluation) => void }) {
  const [open, setOpen] = useState<Section[]>([]);
  const update = <K extends keyof Evaluation>(key: K, value: Evaluation[K]) => onChange({ ...data, [key]: value });
  const text = (key: "leader" | "teamSize" | "roles" | "decisions" | "tools" | "processes" | "channels" | "registeredName" | "registration" | "legalNotes", label: string, multiline = false, placeholder?: string) => <Field label={label}>{multiline ? <Textarea aria-label={label} rows={3} value={data[key]} placeholder={placeholder} onChange={e => update(key, e.target.value)} className="bg-card" /> : <Input aria-label={label} type={key === "teamSize" ? "number" : "text"} min={key === "teamSize" ? 0 : undefined} value={data[key]} placeholder={placeholder} onChange={e => update(key, e.target.value)} className="bg-card" />}</Field>;
  const profit = profitFor(data.turnover, data.charges);
  const allocated = data.beneficiaries.reduce((sum, row) => sum + numeric(row.pct), 0);
  const money = (value: number) => `${value.toFixed(2)} ${data.currency}`;
  const remove = (label: string, onClick: () => void) => <Button variant="ghost" size="icon" type="button" aria-label={label} title={label} className="h-9 w-9 bg-muted text-muted-foreground hover:bg-muted" onClick={onClick}><X /></Button>;
  const content: Record<Section, ReactNode> = {
    Leadership: <><div className="grid gap-4 sm:grid-cols-2">{text("leader", "Leader / responsible person")}{text("teamSize", "Team size")}</div>{text("roles", "Roles and responsibilities", true)}{text("decisions", "How are decisions made?", true)}</>,
    "Products & Services": <>
      <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.4fr)_36px] gap-3 text-xs font-semibold text-muted-foreground sm:grid"><span>Product / service</span><span>Type</span><span>Stage</span><span /></div>
      <div className="divide-y">{data.products.map((product, index) => <div key={product.id} className="grid items-center gap-3 py-3 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.4fr)_36px]">
        <Input aria-label={`Product / service ${index + 1}`} value={product.name} onChange={e => update("products", data.products.map(row => row.id === product.id ? { ...row, name: e.target.value } : row))} />
        <Choice label={`Type ${index + 1}`} value={product.type} options={productTypes} onChange={type => update("products", data.products.map(row => row.id === product.id ? { ...row, type } : row))} />
        <Choice label={`Stage ${index + 1}`} value={product.stage} options={productStages} onChange={stage => update("products", data.products.map(row => row.id === product.id ? { ...row, stage } : row))} />
        {remove(`Remove product ${index + 1}`, () => update("products", data.products.filter(row => row.id !== product.id)))}
      </div>)}</div>
      <Button variant="link" className="h-auto justify-start p-0 text-sm text-evaluation-link" onClick={() => update("products", [...data.products, { id: crypto.randomUUID(), name: "", type: "", stage: "" }])}><Plus />Add product / service</Button>
    </>,
    Systems: <><div className="grid gap-4 sm:grid-cols-2"><Field label="How are activities managed?"><Choice label="How are activities managed?" value={data.activities} options={systemsOptions} onChange={v => update("activities", v)} /></Field>{text("tools", "Main tools / platforms")}</div>{text("processes", "Key systems and processes", true)}</>,
    Communication: <><div className="grid gap-4 sm:grid-cols-2"><Field label="Internal communication"><Choice label="Internal communication" value={data.internalCommunication} options={internalCommunicationOptions} onChange={v => update("internalCommunication", v)} /></Field><Field label="External communication"><Choice label="External communication" value={data.externalCommunication} options={externalCommunicationOptions} onChange={v => update("externalCommunication", v)} /></Field></div>{text("channels", "Channels / notes", true)}</>,
    Cashflow: <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Period"><Choice label="Period" value={data.period} options={periods} onChange={v => update("period", v)} /></Field><Field label="Currency"><Choice label="Currency" value={data.currency} options={currencies} onChange={v => update("currency", v)} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Turnover"><Input aria-label="Turnover" inputMode="decimal" value={data.turnover} onChange={e => update("turnover", e.target.value)} /></Field>
        <Field label="Charges / expenses"><Input aria-label="Charges / expenses" inputMode="decimal" value={data.charges} onChange={e => update("charges", e.target.value)} /></Field>
        <Field label="Profit"><Input aria-label="Profit" value={profit.toFixed(2)} readOnly /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-evaluation-success/10 p-4"><span>Profit = Turnover − Charges</span><strong className={profit < 0 ? "text-destructive" : "text-evaluation-success"}>{money(profit)}</strong></div>
      <div className="space-y-3"><h3 className="font-semibold">How is profit distributed?</h3>{data.beneficiaries.map((row, index) => <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 sm:grid-cols-[minmax(0,1fr)_100px_140px_36px]">
        <Input aria-label={`Beneficiary ${index + 1}`} value={row.name} onChange={e => update("beneficiaries", data.beneficiaries.map(b => b.id === row.id ? { ...b, name: e.target.value } : b))} className="col-span-2 sm:col-span-1" />
        <Input aria-label={`Beneficiary percentage ${index + 1}`} type="number" min={0} max={100} step="0.01" value={row.pct} onChange={e => update("beneficiaries", data.beneficiaries.map(b => b.id === row.id ? { ...b, pct: e.target.value } : b))} />
        <Input aria-label={`Beneficiary amount ${index + 1}`} value={money(beneficiaryAmount(profit, row.pct))} readOnly className="col-start-1 row-start-3 sm:col-auto sm:row-auto" />
        {remove(`Remove beneficiary ${index + 1}`, () => update("beneficiaries", data.beneficiaries.filter(b => b.id !== row.id)))}
      </div>)}<Button variant="link" className="h-auto p-0 text-evaluation-link" onClick={() => update("beneficiaries", [...data.beneficiaries, { id: crypto.randomUUID(), name: "", pct: "" }])}><Plus />Add beneficiary</Button><p className={allocated > 100 ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>Distribution allocated: {Math.round(allocated * 100) / 100}% — {allocated === 100 ? "fully allocated" : allocated > 100 ? "overallocated" : `${Math.round((100 - allocated) * 100) / 100}% unallocated`}</p></div>
    </>,
    Legal: <>
      <Field label="Legal form"><RadioGroup value={data.legalForm} onValueChange={v => update("legalForm", v)} className="grid gap-3 md:grid-cols-3">{[["Solo incorporated", "One owner, incorporated entity"], ["Unincorporated partnership", "Partners without a separate incorporated entity"], ["Incorporated partnership", "A company formed by partners"]].map(([value, description]) => <Label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${data.legalForm === value ? "border-evaluation-link bg-evaluation-link/5" : "border-border"}`}><RadioGroupItem value={value} className="mt-0.5 shrink-0" /><span className="min-w-0"><span className="block font-semibold text-muted-foreground">{value}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span></span></Label>)}</RadioGroup></Field>
      <div className="grid gap-4 sm:grid-cols-2">{text("registeredName", "Registered name")}{text("registration", "Registration / ID", false, "Optional")}</div>{text("legalNotes", "Partners, ownership and legal notes", true, "Partners, shares, agreements, registration status")}
    </>,
  };
  return <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground divide-y">{sections.map(section => {
    const expanded = open.includes(section), evaluation = data.evaluations[section];
    const statusClass = evaluation === "Developing" ? "bg-evaluation-developing/10 text-evaluation-developing" : evaluation === "Established" || evaluation === "Structured" ? "bg-evaluation-success/10 text-evaluation-success" : "bg-muted text-muted-foreground";
    return <section key={section}>
      <h2><Button variant="ghost" className="flex h-auto min-h-16 w-full justify-between gap-4 rounded-none px-5 py-4 text-left text-base hover:bg-muted/30 hover:text-foreground" aria-expanded={expanded} aria-controls={`evaluation-${section}`} onClick={() => setOpen(previous => expanded ? previous.filter(s => s !== section) : [...previous, section])}><span>{section}</span><span className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{evaluation || "Choose evaluation"}</span><ChevronDown className={`text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} /></span></Button></h2>
      {expanded && <div id={`evaluation-${section}`} className="space-y-5 border-t px-5 py-5">{content[section]}<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Label className="font-semibold text-muted-foreground">{section === "Products & Services" ? "Products" : section} evaluation</Label><div className="w-full sm:w-56"><Choice label={`${section} evaluation`} value={evaluation} options={evaluationOptions} placeholder="Choose evaluation" onChange={value => update("evaluations", { ...data.evaluations, [section]: value })} /></div></div></div>}
    </section>;
  })}</div>;
}