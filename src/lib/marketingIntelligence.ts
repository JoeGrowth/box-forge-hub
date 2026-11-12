export type OfferKind = "service" | "digital_product" | "product";

export const OFFER_KIND_LABEL: Record<OfferKind, string> = {
  service: "Service",
  digital_product: "Digital product",
  product: "Product",
};

export interface ChecklistItem { label: string; desc: string; done?: boolean }
export interface IdentRow { element: string; info: string }
export interface ValueRow { angle: string; value: string; pain: string }
export interface PriorityRow { angle: string; message: string }
export interface ValidationRow { angle: string; functionality: string; status: string }
export interface MarketSignal { headline: string; insight: string; source?: string }

export interface AnalysisContent {
  subtitle?: string;
  checklist: ChecklistItem[];
  identification: IdentRow[];
  researchNote?: string;
  principle?: string;
  marketSignals: MarketSignal[];
  avatar?: string;
  addedValue: ValueRow[];
  priorities: PriorityRow[];
  validation: ValidationRow[];
  rule?: string;
  workflow: string[];
  deliverableTitle?: string;
  deliverableItems?: string;
  researchedOn?: string;
}

export interface ResearchLink { label: string; url: string }

/** Research sources per offer type; queries use the page name so links refresh for every new page. */
export function researchLinks(kind: OfferKind, name: string): ResearchLink[] {
  const q = encodeURIComponent(name.trim() || "product");
  const news: ResearchLink = { label: "Google News (past month)", url: `https://news.google.com/search?q=${q}%20when%3A30d` };
  if (kind === "digital_product") {
    return [
      { label: "Google Search", url: `https://www.google.com/search?q=${q}+alternatives` },
      { label: "Product Hunt", url: `https://www.producthunt.com/search?q=${q}` },
      { label: "G2", url: `https://www.g2.com/search?query=${q}` },
      { label: "Capterra", url: `https://www.capterra.com/search/?query=${q}` },
      { label: "TrustRadius", url: `https://www.trustradius.com/search?q=${q}` },
      news,
    ];
  }
  if (kind === "service") {
    return [
      { label: "Google Search", url: `https://www.google.com/search?q=${q}` },
      { label: "Eventbrite", url: `https://www.eventbrite.com/d/online/${q}/` },
      { label: "Coursera", url: `https://www.coursera.org/search?query=${q}` },
      { label: "Udemy", url: `https://www.udemy.com/courses/search/?q=${q}` },
      { label: "LinkedIn", url: `https://www.linkedin.com/search/results/all/?keywords=${q}` },
      news,
    ];
  }
  return [
    { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { label: "Amazon", url: `https://www.amazon.com/s?k=${q}` },
    { label: "AliExpress", url: `https://www.aliexpress.com/w/wholesale-${q}.html` },
    { label: "Jumia", url: `https://www.jumia.com.tn/catalog/?q=${q}` },
    { label: "Trustpilot", url: `https://www.trustpilot.com/search?query=${q}` },
    news,
  ];
}

export const SECTION_COPY: Record<OfferKind, { research: string; researchDesc: string; offerWord: string; validationCol: string }> = {
  digital_product: {
    research: "Competitive product research",
    researchDesc: "Understand the category, competing offers and market positioning.",
    offerWord: "Product",
    validationCol: "Required functionality to verify",
  },
  service: {
    research: "Competitive service research",
    researchDesc: "Research comparable services to understand market positioning.",
    offerWord: "Service",
    validationCol: "Required delivery capability to verify",
  },
  product: {
    research: "Competitive product research",
    researchDesc: "Compare similar physical products, prices, channels and reviews.",
    offerWord: "Product",
    validationCol: "Required product attribute to verify",
  },
};

export function emptyContent(): AnalysisContent {
  return { checklist: [], identification: [], marketSignals: [], addedValue: [], priorities: [], validation: [], workflow: [] };
}

/** Accepts unknown JSON (AI output or stored row) and returns a safe, fully-shaped content object. */
export function normalizeContent(raw: unknown): AnalysisContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = <T>(v: unknown, map: (o: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => map(x as Record<string, unknown>)) : [];
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  return {
    subtitle: s(r.subtitle),
    checklist: arr(r.checklist, (o) => ({ label: s(o.label), desc: s(o.desc), done: !!o.done })),
    identification: arr(r.identification, (o) => ({ element: s(o.element), info: s(o.info) })),
    researchNote: s(r.researchNote),
    principle: s(r.principle),
    marketSignals: arr(r.marketSignals, (o) => ({ headline: s(o.headline), insight: s(o.insight), source: s(o.source) })),
    avatar: s(r.avatar),
    addedValue: arr(r.addedValue, (o) => ({ angle: s(o.angle), value: s(o.value), pain: s(o.pain) })),
    priorities: arr(r.priorities, (o) => ({ angle: s(o.angle), message: s(o.message) })),
    validation: arr(r.validation, (o) => ({ angle: s(o.angle), functionality: s(o.functionality), status: s(o.status) || "To confirm" })),
    rule: s(r.rule),
    workflow: Array.isArray(r.workflow) ? r.workflow.map(s).filter(Boolean) : [],
    deliverableTitle: s(r.deliverableTitle),
    deliverableItems: s(r.deliverableItems),
    researchedOn: s(r.researchedOn),
  };
}
