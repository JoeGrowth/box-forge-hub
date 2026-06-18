import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { useUserStatus } from "./useUserStatus";
import { useAdmin } from "./useAdmin";

// P0 — Canonical access level.
// Backed by existing onboarding_state.user_status + user_roles.admin.
// pending = signed in but not yet "approved" by an admin.

export type AccessLevel = "guest" | "pending" | "approved" | "admin";

export interface AccessCapabilities {
  browse: boolean;        // view opportunities, people, boxes
  save: boolean;          // bookmark opportunities
  receiveRecs: boolean;   // see Next Best Actions / recommendations
  apply: boolean;         // apply to opportunities
  publish: boolean;       // publish jobs, services, trainings, ideas
}

export interface AccessLevelResult {
  level: AccessLevel;
  loading: boolean;
  can: AccessCapabilities;
}

export function useAccessLevel(): AccessLevelResult {
  const { user, loading: authLoading } = useAuth();
  const { statusData, loading: statusLoading } = useUserStatus();
  const { isAdmin, loading: adminLoading } = useAdmin();

  return useMemo<AccessLevelResult>(() => {
    const loading = authLoading || statusLoading || adminLoading;

    let level: AccessLevel = "guest";
    if (user) {
      if (isAdmin) level = "admin";
      else if (
        statusData?.user_status === "approved" ||
        statusData?.user_status === "boosted" ||
        statusData?.user_status === "scaled"
      ) {
        level = "approved";
      } else {
        level = "pending";
      }
    }

    const can: AccessCapabilities = {
      browse: level !== "guest",
      save: level !== "guest",
      receiveRecs: level !== "guest",
      apply: level === "approved" || level === "admin",
      publish: level === "approved" || level === "admin",
    };

    return { level, loading, can };
  }, [user, authLoading, statusData, statusLoading, isAdmin, adminLoading]);
}
