// Canonical UI contract for any opportunity detail surface.
// Both StartupOpportunityDetail and GenericOpportunityDetail consume this
// model. Category-specific UI (e.g. equity wizard) is a rendering variation,
// never a branching logic concern in the dispatcher.

export type OpportunityCategory = "job" | "training" | "consulting" | "tender" | "startup";

export type RewardType = "salary" | "equity" | "budget" | "price" | "hourly" | "free";

export interface OpportunityDetailModel {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  actor: {
    user_id: string | null;
    name: string;
    bio?: string | null;
    label: string; // "Initiator" | "Author" | "Company"
  };
  reward: {
    type: RewardType;
    display: string;
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements: {
    skills: string[];
    experience_level?: string | null;
    trust_threshold?: string | null;
    requirements_text?: string | null;
  };
  context: {
    sector: string | null;
    location: string | null;
    timeline: string | null; // deadline / duration / employment_type
  };
  actions: {
    primary: { type: "apply" | "join" | "request_contact"; label: string };
    secondary?: { label: string; route: string }[];
  };
  created_at: string;
  raw?: any; // escape hatch for category-specific fields (roles_needed, etc)
}

// ---------- Adapters ----------

function parseRange(s?: string | null): { min?: number; max?: number; currency?: string } {
  if (!s) return {};
  const cleaned = s.replace(/,/g, "");
  const nums = cleaned.match(/\d+(\.\d+)?/g);
  const currency = cleaned.match(/[A-Z]{3}/)?.[0];
  if (!nums) return { currency };
  return {
    min: parseFloat(nums[0]),
    max: nums[1] ? parseFloat(nums[1]) : undefined,
    currency,
  };
}

export function modelFromJob(raw: any, actorName: string): OpportunityDetailModel {
  const range = parseRange(raw.salary_range);
  return {
    id: raw.id,
    category: "job",
    title: raw.title,
    description: raw.description,
    actor: {
      user_id: raw.user_id ?? null,
      name: raw.company || actorName,
      label: "Company",
    },
    reward: {
      type: "salary",
      display: raw.salary_range || "Salary not disclosed",
      ...range,
    },
    requirements: {
      skills: [raw.sector, raw.employment_type, raw.location].filter(Boolean),
      experience_level: null,
      requirements_text: raw.requirements ?? null,
    },
    context: { sector: raw.sector ?? null, location: raw.location ?? null, timeline: raw.employment_type ?? null },
    actions: { primary: { type: "apply", label: "Apply for this role" } },
    created_at: raw.created_at,
    raw,
  };
}

export function modelFromTraining(raw: any, actorName: string): OpportunityDetailModel {
  return {
    id: raw.id,
    category: "training",
    title: raw.title,
    description: raw.description,
    actor: { user_id: raw.user_id ?? null, name: actorName, label: "Trainer" },
    reward: { type: "free", display: "Free" },
    requirements: {
      skills: [raw.sector, raw.target_audience, raw.format].filter(Boolean),
      requirements_text: null,
    },
    context: { sector: raw.sector ?? null, location: raw.format ?? null, timeline: raw.duration ?? null },
    actions: { primary: { type: "request_contact", label: "Request enrollment" } },
    created_at: raw.created_at,
    raw,
  };
}

export function modelFromTender(raw: any, actorName: string): OpportunityDetailModel {
  const range = parseRange(raw.budget_range);
  return {
    id: raw.id,
    category: "tender",
    title: raw.title,
    description: raw.description,
    actor: { user_id: raw.user_id ?? null, name: actorName, label: "Issuer" },
    reward: { type: "budget", display: raw.budget_range || "Budget on request", ...range },
    requirements: {
      skills: [raw.sector, raw.location].filter(Boolean),
      requirements_text: raw.requirements ?? null,
    },
    context: {
      sector: raw.sector ?? null,
      location: raw.location ?? null,
      timeline: raw.deadline ? `Deadline ${raw.deadline}` : null,
    },
    actions: { primary: { type: "apply", label: "Submit proposal" } },
    created_at: raw.created_at,
    raw,
  };
}

export function modelFromConsulting(raw: any, actorName: string): OpportunityDetailModel {
  return {
    id: raw.id,
    category: "consulting",
    title: raw.service_title,
    description: raw.description || `Consulting service offered by ${actorName}.`,
    actor: { user_id: raw.user_id ?? null, name: actorName, label: "Consultant" },
    reward: {
      type: raw.price > 0 ? "price" : "free",
      display: raw.price > 0 ? `${raw.price} ${raw.currency || ""}`.trim() : "Free",
      min: raw.price || undefined,
      currency: raw.currency,
    },
    requirements: { skills: [raw.delivery_type, raw.availability].filter(Boolean) },
    context: { sector: null, location: raw.delivery_type ?? null, timeline: raw.availability ?? null },
    actions: { primary: { type: "request_contact", label: "Request this service" } },
    created_at: raw.created_at,
    raw,
  };
}

export function modelFromStartup(raw: any, actorName: string): OpportunityDetailModel {
  return {
    id: raw.id,
    category: "startup",
    title: raw.title,
    description: raw.description,
    actor: { user_id: raw.creator_id ?? null, name: actorName, label: "Initiator" },
    reward: { type: "equity", display: "Equity-based" },
    requirements: { skills: raw.roles_needed || [] },
    context: { sector: raw.sector ?? null, location: null, timeline: null },
    actions: { primary: { type: "join", label: "Apply to join" } },
    created_at: raw.created_at,
    raw,
  };
}
