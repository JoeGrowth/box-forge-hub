// Sales funnel: Traffic -> Lead -> MQL -> SQL -> Client.
// Each step requires all 3 checks of that gate, in order.

export type FunnelStage = "traffic" | "lead" | "mql" | "sql" | "client";

export interface FunnelGate {
  to: Exclude<FunnelStage, "traffic">;
  label: string;
  checks: { key: string; label: string }[];
}

export const FUNNEL_GATES: FunnelGate[] = [
  { to: "lead", label: "Lead", checks: [
    { key: "contact_identified", label: "Contact identified" },
    { key: "need_expressed", label: "Need expressed" },
    { key: "title_known", label: "Title / role known" },
  ] },
  { to: "mql", label: "MQL", checks: [
    { key: "meeting_held", label: "Meeting held" },
    { key: "budget_range", label: "Budget range shared" },
    { key: "decision_timeline", label: "Decision timeline known" },
  ] },
  { to: "sql", label: "SQL", checks: [
    { key: "decision_maker", label: "Decision-maker engaged" },
    { key: "proposal_requested", label: "Proposal requested" },
    { key: "budget_confirmed", label: "Budget confirmed" },
  ] },
  { to: "client", label: "Client", checks: [
    { key: "proposal_accepted", label: "Proposal accepted" },
    { key: "contract_signed", label: "Contract signed" },
    { key: "first_payment", label: "First payment received" },
  ] },
];

export const STAGE_LABEL: Record<FunnelStage, string> = {
  traffic: "Traffic", lead: "Lead", mql: "MQL", sql: "SQL", client: "Client",
};

export function computeStage(checks: Record<string, boolean> | null | undefined): FunnelStage {
  let stage: FunnelStage = "traffic";
  for (const gate of FUNNEL_GATES) {
    if (gate.checks.every((c) => checks?.[c.key])) stage = gate.to;
    else break;
  }
  return stage;
}

export type SalesStatus = "in_negotiation" | "delivered" | "no_answer";
export const isArchived = (status: SalesStatus) => status === "no_answer";
