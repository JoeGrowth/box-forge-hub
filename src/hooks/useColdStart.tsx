import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ColdStartProfile {
  user_id: string;
  decoder_result: Record<string, unknown>;
  seed_source: string;
  confidence: number;
  estimated_expertise: string[];
  verified_expertise: string[];
  confirmed: boolean;
  confirmed_at: string | null;
}

export function useColdStart() {
  return useQuery({
    queryKey: ["cold_start_profile"],
    queryFn: async () => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("cold_start_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ColdStartProfile | null;
    },
  });
}

/** Seed estimated expertise from NR decoder result. Idempotent upsert. */
export function useSeedColdStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decoder_result: Record<string, unknown>;
      estimated_expertise: string[];
      confidence: number;
      seed_source?: string;
    }) => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("cold_start_profiles")
        .upsert([{
          user_id: uid,
          decoder_result: input.decoder_result as never,
          estimated_expertise: input.estimated_expertise as never,
          confidence: input.confidence,
          seed_source: input.seed_source ?? "nr_decoder",
        }], { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ColdStartProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cold_start_profile"] }),
  });
}

export function useConfirmColdStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { verified_expertise: string[] }) => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("cold_start_profiles")
        .update({
          verified_expertise: input.verified_expertise as never,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq("user_id", uid)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ColdStartProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cold_start_profile"] }),
  });
}
