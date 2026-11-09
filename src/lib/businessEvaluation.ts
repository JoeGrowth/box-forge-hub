export const evaluationOptions = ["Not established", "Developing", "Established", "Structured"] as const;
export const productTypes = ["Product", "Service", "Others"];
export const productStages = ["Idea", "Testing", "In development", "Active", "Paused"];
export const periods = ["Monthly", "Quarterly", "Yearly", "Threshold"];
export const currencies = ["TND", "EUR", "USD"];
export const systemsOptions = ["Informal / manual", "Partially documented", "Documented processes", "Automated / integrated"];
export const internalCommunicationOptions = ["Informal", "Regular but not structured", "Defined channels and rhythm", "Documented and coordinated"];
export const externalCommunicationOptions = ["None / occasional", "Active but inconsistent", "Regular and consistent", "Planned and measured"];
export const sections = ["Leadership", "Products & Services", "Systems", "Communication", "Cashflow", "Legal"] as const;
export type Section = typeof sections[number];
export interface Evaluation {
  leader: string; teamSize: string; roles: string; decisions: string;
  products: { id: string; name: string; type: string; stage: string }[];
  activities: string; tools: string; processes: string;
  internalCommunication: string; externalCommunication: string; channels: string;
  period: string; currency: string; turnover: string; charges: string;
  beneficiaries: { id: string; name: string; pct: string }[];
  legalForm: string; registeredName: string; registration: string; legalNotes: string;
  evaluations: Record<Section, string>;
}
export function evaluationOrganizations<T extends { organization: { id: string } }>(memberships: T[]): T["organization"][] {
  return memberships.filter((m, i) => memberships.findIndex(other => other.organization.id === m.organization.id) === i).map(m => m.organization);
}
export const numeric = (value: string) => { const n = Number(value.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
export const profitFor = (turnover: string, charges: string) => Math.round((numeric(turnover) - numeric(charges)) * 100) / 100;
export const beneficiaryAmount = (profit: number, pct: string) => Math.round(profit * numeric(pct)) / 100;
export const evaluationStorageKey = (userId: string, orgId: string) => `b4:business-evaluation:v1:${userId}:${orgId}`;
export function initialEvaluation(name: string, slug: string): Evaluation {
  const pengry = slug.toLowerCase() === "pengry";
  return {
    leader: pengry ? "Houssem (supposed)" : "", teamSize: pengry ? "2" : "", roles: pengry ? "- Houssem : Build Trust (External Project)\n- Youssef : Structure (Internal Project)\n- Iyadh : Debug and realign (Internal Project)" : "", decisions: pengry ? "no decision model" : "",
    products: pengry ? ["Cyber Security Audit & Consultation For NPO", "Device Verification [Phones & Laptops]", "Digital Security Workshop [8 hours]"].map((name, i) => ({ id: `example-${i}`, name, type: "Service", stage: "In development" })) : [],
    activities: pengry ? "Partially documented" : "", tools: pengry ? "Sheets, B4" : "", processes: pengry ? "- Sales\n- Delivery\n- Finance\n- Operations" : "",
    internalCommunication: pengry ? "Regular but not structured" : "", externalCommunication: pengry ? "Active but inconsistent" : "", channels: pengry ? "Meetings, email, social media, CRM" : "",
    period: pengry ? "Yearly" : "Monthly", currency: "TND", turnover: pengry ? "12400.00" : "", charges: pengry ? "12293.50" : "",
    beneficiaries: pengry ? [["Houssem kaabi", "21"], ["Youssef Ben Younes", "9"], ["Infrastructure", "28"], ["Business Launching", "42"]].map(([name, pct], i) => ({ id: `example-${i}`, name, pct })) : [],
    legalForm: pengry ? "Unincorporated partnership" : "", registeredName: name, registration: "", legalNotes: "",
    evaluations: Object.fromEntries(sections.map(section => [section, pengry ? (section === "Legal" ? "Not established" : "Developing") : ""])) as Record<Section, string>,
  };
}
// ---- Automatic figures derived from organization records (read-only) ----
export const normalizePersonName = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
/** Unique people across accepted associés, accepted entity core team and crew members (same full name counted once). */
export function teamSizeFrom(names: (string | null | undefined)[]) {
  return new Set(names.map(normalizePersonName).filter(Boolean)).size;
}
export const supposedLeader = (fullName?: string | null) => {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first ? `${first.charAt(0).toUpperCase()}${first.slice(1)} (supposed)` : "";
};
/** 2 shipped = expanding (yellow), 3+ shipped = diversification risk (red); fewer are not flagged. */
export function productMaturity(shipped: number): { tone: "yellow" | "red"; label: string } | null {
  if (shipped >= 3) return { tone: "red", label: "Diversification risk — template needed" };
  if (shipped === 2) return { tone: "yellow", label: "Expanding" };
  return null;
}
export interface StatementEntity { id: string; name: string; split_config: { recognitionPct?: number; infraPct?: number; partners?: { id: string; name: string; pct: number }[] } | null }
export interface StatementMission { entity_id: string; budget: number | null; currency: string | null; internal: { amount: number }[] | null; external: { amount: number }[] | null }
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Mirrors the organization statement: profit is each mission's unallocated rest; charges = turnover − profit. */
export function statementSummary(entity: StatementEntity, missions: StatementMission[], currency: string, associateNames: string[] = []) {
  let turnover = 0, profit = 0;
  for (const m of missions.filter(m => m.entity_id === entity.id && (m.currency || "TND") === currency)) {
    const budget = Number(m.budget) || 0;
    const used = [...(m.internal ?? []), ...(m.external ?? [])].reduce((s, p) => s + (Number(p.amount) || 0), 0);
    turnover += budget; profit += Math.max(0, budget - used);
  }
  const recognition = Math.min(45, Math.max(0, Number(entity.split_config?.recognitionPct ?? 30)));
  const infraPct = Math.min(100, Math.max(0, Number(entity.split_config?.infraPct ?? 40)));
  const partners = entity.split_config?.partners?.length ? entity.split_config.partners : [{ id: "p1", name: "Associé 1", pct: 100 }];
  const partnerTotal = partners.reduce((s, p) => s + (Number(p.pct) || 0), 0) || 100;
  const investment = 100 - recognition;
  const rows = [
    ...partners.map((p, i) => ({ name: associateNames[i] || p.name, pct: r2(recognition * (Number(p.pct) || 0) / partnerTotal) })),
    { name: "Infrastructure", pct: r2(investment * infraPct / 100) },
    { name: "Business Launching", pct: r2(investment * (100 - infraPct) / 100) },
  ].map(row => ({ ...row, amount: r2(profit * row.pct / 100) }));
  return { turnover: r2(turnover), charges: r2(turnover - profit), profit: r2(profit), rows };
}
export interface EvaluationAuto {
  leader: string; teamSize: number; products: { name: string; shipped: number }[];
  entities: StatementEntity[]; missions: (StatementMission & { entity_id: string })[]; associateNames: Record<string, string[]>;
}
