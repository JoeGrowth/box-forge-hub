import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BetaHealth {
  total_users: number;
  users_with_expertise: number;
  users_with_trust: number;
  recommendation_rows: number;
  users_with_recommendations: number;
  events_24h: number;
  dlq_size: number;
  applications_total: number;
  applications_accepted: number;
  applications_completed: number;
  loops_7d: number;
  loops_converted_7d: number;
  notif_failed: number;
  notif_delivered: number;
}

export function useBetaHealth() {
  return useQuery({
    queryKey: ["admin_beta_health"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_beta_health");
      if (error) throw error;
      return data as unknown as BetaHealth;
    },
  });
}
