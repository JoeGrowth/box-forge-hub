import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ApplicationStatus =
  | "submitted" | "reviewing" | "shortlisted"
  | "accepted" | "rejected" | "withdrawn" | "completed";

export type ApplicationKind = "job" | "startup" | "tender" | "consulting" | "training";

export interface ApplicationRow {
  id: string;
  applicant_id: string;
  opportunity_id: string;
  opportunity_type: ApplicationKind;
  owner_id: string | null;
  status: ApplicationStatus;
  message: string | null;
  metadata: Record<string, unknown>;
  submitted_at: string;
  reviewed_at: string | null;
  shortlisted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Read the current user's outbound applications. */
export function useMyApplications() {
  return useQuery({
    queryKey: ["applications", "mine"],
    queryFn: async () => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) return [] as ApplicationRow[];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("applicant_id", uid)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
  });
}

/** Read inbound applications targeting opportunities the current user owns. */
export function useInboundApplications() {
  return useQuery({
    queryKey: ["applications", "inbound"],
    queryFn: async () => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) return [] as ApplicationRow[];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("owner_id", uid)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      opportunity_id: string;
      opportunity_type: ApplicationKind;
      owner_id: string | null;
      message?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("applications")
        .insert({
          applicant_id: uid,
          opportunity_id: input.opportunity_id,
          opportunity_type: input.opportunity_type,
          owner_id: input.owner_id,
          message: input.message ?? null,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application submitted");
    },
    onError: (err: Error) => toast.error(err.message || "Could not submit application"),
  });
}

export function useTransitionApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ApplicationStatus }) => {
      const { data, error } = await supabase
        .from("applications")
        .update({ status: input.status })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Application ${row.status}`);
    },
    onError: (err: Error) => toast.error(err.message || "Could not update application"),
  });
}
