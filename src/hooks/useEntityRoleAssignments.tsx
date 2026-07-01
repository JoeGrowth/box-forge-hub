import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EntityRoleStatus = "pending" | "accepted" | "declined" | "revoked";

export interface EntityRoleAssignment {
  id: string;
  entity_type: string;
  entity_id: string;
  role_slug: string;
  slot: number;
  label: string;
  linked_user_id: string | null;
  equity_pct: number | null;
  status: EntityRoleStatus;
  linked_by: string | null;
  linked_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
  effective_from: string | null;
  effective_until: string | null;
  linked_profile?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

async function fetchAssignmentsForEntity(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from("entity_role_assignments" as never)
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("slot", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as EntityRoleAssignment[];
  const userIds = Array.from(new Set(rows.map((r) => r.linked_user_id).filter(Boolean))) as string[];
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    return rows.map((r) => ({ ...r, linked_profile: r.linked_user_id ? map.get(r.linked_user_id) ?? null : null }));
  }
  return rows;
}

export function useEntityRoleAssignments(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: ["entity_role_assignments", entityType, entityId],
    queryFn: () => fetchAssignmentsForEntity(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });
}

// Pending requests where the current user is the target.
export function useMyPendingRoleLinks() {
  return useQuery({
    queryKey: ["my_pending_role_links"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return [] as EntityRoleAssignment[];
      const { data, error } = await supabase
        .from("entity_role_assignments" as never)
        .select("*")
        .eq("linked_user_id", uid)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []) as unknown as EntityRoleAssignment[];
    },
  });
}

export function useRequestLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assignmentId: string;
      linkedUserId: string;
      equityPct?: number | null;
      label?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("request_entity_role_link" as never, {
        _assignment_id: input.assignmentId,
        _linked_user_id: input.linkedUserId,
        _equity_pct: input.equityPct ?? null,
        _label: input.label ?? null,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entity_role_assignments"] }),
  });
}

export function useAcceptLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase.rpc("accept_entity_role_link" as never, {
        _assignment_id: assignmentId,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity_role_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_pending_role_links"] });
      qc.invalidateQueries({ queryKey: ["verified_affiliations"] });
    },
  });
}

export function useDeclineLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase.rpc("decline_entity_role_link" as never, {
        _assignment_id: assignmentId,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity_role_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_pending_role_links"] });
    },
  });
}

export function useRevokeLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase.rpc("revoke_entity_role_link" as never, {
        _assignment_id: assignmentId,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity_role_assignments"] });
      qc.invalidateQueries({ queryKey: ["verified_affiliations"] });
    },
  });
}

export function useVerifiedAffiliations(userId: string | undefined) {
  return useQuery({
    queryKey: ["verified_affiliations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("verified_affiliations" as never)
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });
}

export function useOwnershipEdges(userId: string | undefined) {
  return useQuery({
    queryKey: ["ownership_edges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("ownership_edges" as never)
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });
}
