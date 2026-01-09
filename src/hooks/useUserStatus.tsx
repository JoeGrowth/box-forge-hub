import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export type UserStatus = "applied" | "approved" | "boosted" | "scaled";
export type PotentialRole = "potential_co_builder" | "potential_entrepreneur" | null;
export type BoostType = "boosted_co_builder" | "boosted_initiator" | "boosted_talent" | null;
export type ScaleType = "venture_promise" | "personal_promise" | null;

interface UserStatusData {
  user_status: UserStatus | null;
  potential_role: PotentialRole;
  boost_type: BoostType;
  scale_type: ScaleType;
  journey_status: string | null;
  onboarding_completed: boolean;
  primary_role: string | null;
}

export const useUserStatus = () => {
  const { user } = useAuth();
  const [statusData, setStatusData] = useState<UserStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!user) {
      setStatusData(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("onboarding_state")
        .select("user_status, potential_role, boost_type, scale_type, journey_status, onboarding_completed, primary_role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user status:", error);
        setStatusData(null);
      } else {
        setStatusData(data as UserStatusData);
      }
    } catch (err) {
      console.error("Error in useUserStatus:", err);
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  // Access control helpers
  const canAccessBoosting = statusData?.user_status === "approved" || 
                            statusData?.user_status === "boosted" || 
                            statusData?.user_status === "scaled";
  
  const canAccessScaling = statusData?.user_status === "boosted" || 
                           statusData?.user_status === "scaled";

  const getStatusLabel = (): string => {
    if (!statusData) return "Unknown";
    
    switch (statusData.user_status) {
      case "applied":
        return "Applied – Pending Review";
      case "approved":
        return "Approved – Ready to Boost";
      case "boosted":
        if (statusData.boost_type) {
          const boostLabels: Record<string, string> = {
            boosted_co_builder: "Boosted Co-Builder",
            boosted_initiator: "Boosted Initiator",
            boosted_talent: "Boosted Talent",
          };
          return boostLabels[statusData.boost_type] || "Boosted";
        }
        return "Boosted";
      case "scaled":
        if (statusData.scale_type) {
          const scaleLabels: Record<string, string> = {
            venture_promise: "Scaled – Venture Promise",
            personal_promise: "Scaled – Personal Promise",
          };
          return scaleLabels[statusData.scale_type] || "Scaled User";
        }
        return "Scaled User";
      default:
        return "Member";
    }
  };

  const getStatusBadgeVariant = (): "default" | "secondary" | "outline" => {
    if (!statusData?.user_status) return "secondary";
    
    switch (statusData.user_status) {
      case "applied":
        return "secondary";
      case "approved":
        return "outline";
      case "boosted":
      case "scaled":
        return "default";
      default:
        return "secondary";
    }
  };

  return {
    statusData,
    loading,
    refetch: fetchStatus,
    canAccessBoosting,
    canAccessScaling,
    getStatusLabel,
    getStatusBadgeVariant,
    userStatus: statusData?.user_status ?? null,
    potentialRole: statusData?.potential_role ?? null,
    boostType: statusData?.boost_type ?? null,
    scaleType: statusData?.scale_type ?? null,
  };
};
