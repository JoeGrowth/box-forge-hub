// Sprint 4A — opportunity graph client helpers.
// Application = request. Relationship = ongoing trust. Keep separate.

import { supabase } from "@/integrations/supabase/client";

export type OpportunityType =
  | "co_builder"
  | "advisor"
  | "partnership"
  | "hiring"
  | "investment"
  | "consulting"
  | "collaboration";

export type OpportunityStatus =
  | "draft"
  | "open"
  | "matched"
  | "accepted"
  | "closed"
  | "expired";

export type OpportunityApplicationStatus =
  | "pending"
  | "shortlisted"
  | "matched"
  | "accepted"
  | "declined"
  | "withdrawn";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  creator_id: string;
  source_entity_type: string | null;
  source_entity_id: string | null;
  status: OpportunityStatus;
  visibility: "public" | "box" | "private";
  box_id: string | null;
  metadata: Record<string, unknown>;
  opened_at: string | null;
  closed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  message: string | null;
  status: OpportunityApplicationStatus;
  relationship_id: string | null;
  metadata: Record<string, unknown>;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listOpenOpportunities(filters?: {
  type?: OpportunityType;
  boxId?: string;
}) {
  let q = supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (filters?.type) q = q.eq("type", filters.type);
  if (filters?.boxId) q = q.eq("box_id", filters.boxId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

export async function createOpportunity(input: {
  type: OpportunityType;
  title: string;
  description?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  box_id?: string;
  visibility?: "public" | "box" | "private";
  status?: "draft" | "open";
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("opportunities")
    .insert([
      {
        creator_id: user.user.id,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        source_entity_type: input.source_entity_type ?? null,
        source_entity_id: input.source_entity_id ?? null,
        box_id: input.box_id ?? null,
        visibility: input.visibility ?? "public",
        status: input.status ?? "open",
        metadata: (input.metadata ?? {}) as any,
        idempotency_key: input.idempotency_key ?? null,
      },
    ])
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Opportunity;
}

export async function openOpportunity(opportunityId: string) {
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status: "open" })
    .eq("id", opportunityId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function closeOpportunity(
  opportunityId: string,
  reason: "closed" | "expired" = "closed",
) {
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status: reason })
    .eq("id", opportunityId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function applyToOpportunity(input: {
  opportunity_id: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("opportunity_applications")
    .insert([
      {
        opportunity_id: input.opportunity_id,
        applicant_id: user.user.id,
        message: input.message ?? null,
        metadata: (input.metadata ?? {}) as any,
        idempotency_key: `opp_app:${input.opportunity_id}:${user.user.id}`,
      },
    ])
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as OpportunityApplication;
}

export async function decideApplication(
  applicationId: string,
  decision: "shortlisted" | "matched" | "accepted" | "declined",
) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .update({ status: decision })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error) throw error;
  return data as OpportunityApplication;
}

export async function withdrawApplication(applicationId: string) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error) throw error;
  return data as OpportunityApplication;
}

export async function listApplicationsForOpportunity(opportunityId: string) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpportunityApplication[];
}

export async function listMyApplications() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [] as OpportunityApplication[];
  const { data, error } = await supabase
    .from("opportunity_applications")
    .select("*")
    .eq("applicant_id", user.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpportunityApplication[];
}
