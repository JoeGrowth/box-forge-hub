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