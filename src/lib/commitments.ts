import { supabase } from "@/integrations/supabase/client";

export type CommitmentStatus = "pending" | "active" | "completed" | "failed" | "cancelled";

export interface Commitment {
  id: string;
  owner_id: string;
  relationship_id: string | null;
  box_id: string | null;
  title: string;
  description: string | null;
  duration_days: number;
  status: CommitmentStatus;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_from: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CommitmentCheckpoint {
  id: string;
  commitment_id: string;
  day_offset: number;
  label: string;
  note: string | null;
  completed_at: string;
}

export async function listMyCommitments() {
  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Commitment[];
}

export async function listCheckpointsFor(commitmentIds: string[]) {
  if (commitmentIds.length === 0) return [] as CommitmentCheckpoint[];
  const { data, error } = await supabase
    .from("commitment_checkpoints")
    .select("id, commitment_id, day_offset, label, note, completed_at")
    .in("commitment_id", commitmentIds);
  if (error) throw error;
  return (data ?? []) as CommitmentCheckpoint[];
}

export async function startCommitment(id: string) {
  const now = new Date();
  const { data: c, error: fetchErr } = await supabase
    .from("commitments").select("duration_days").eq("id", id).single();
  if (fetchErr) throw fetchErr;
  const due = new Date(now.getTime() + (c.duration_days || 14) * 86400000);
  const { error } = await supabase
    .from("commitments")
    .update({ status: "active", started_at: now.toISOString(), due_at: due.toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function completeCommitment(id: string) {
  const { error } = await supabase
    .from("commitments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function failCommitment(id: string) {
  const { error } = await supabase.from("commitments").update({ status: "failed" }).eq("id", id);
  if (error) throw error;
}

export async function addCheckpoint(input: {
  commitment_id: string;
  owner_id: string;
  day_offset: number;
  label: string;
  note?: string;
}) {
  const { error } = await supabase.from("commitment_checkpoints").insert(input);
  if (error) throw error;
}

export async function createCommitment(input: {
  title: string;
  description?: string;
  duration_days?: number;
  relationship_id?: string | null;
  box_id?: string | null;
  created_from?: "activation" | "advisor" | "milestone" | "negotiation" | "ritual" | "self";
}) {
  const { data: userRes } = await supabase.auth.getUser();
  const owner_id = userRes.user?.id;
  if (!owner_id) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      owner_id,
      title: input.title,
      description: input.description ?? null,
      duration_days: input.duration_days ?? 14,
      relationship_id: input.relationship_id ?? null,
      box_id: input.box_id ?? null,
      created_from: input.created_from ?? "self",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Commitment;
}
