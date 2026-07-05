import { ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
import { useEngineAccess, type EngineKey } from "@/hooks/useEngineAccess";
import { useNextBestActions } from "@/hooks/useNextBestActions";
import { Skeleton } from "@/components/ui/skeleton";

// Enforces the same lock rules the Navbar shows in the UI, but at the route
// level — so typing a locked URL directly (e.g. /opportunities) bounces the
// user instead of rendering the page.
export const STAGE_RANK = {
  novice: 0,
  emerging: 1,
  capable: 2,
  monetizing: 3,
  building: 4,
  founder: 5,
} as const;
export type Stage = keyof typeof STAGE_RANK;

interface GatedRouteProps {
  children?: ReactNode;
  /** Requires Talent Foundation to be set (intent + NR decoder + pro track + resume). */
  talentGate?: boolean;
  /** Requires the given Engine to be unlocked in useEngineAccess. */
  engineKey?: EngineKey;
  /** Requires the user to be admin/owner of at least one organization. */
  orgAdminOnly?: boolean;
  /** Requires progression stage >= this value (e.g. "emerging"). */
  minStage?: Stage;
}

export function GatedRoute({
  children,
  talentGate = false,
  engineKey,
  orgAdminOnly = false,
  minStage,
}: GatedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: talentLoading,
    talentReady,
    isOrgAdmin,
  } = useTalentReadiness();
  const { engines, loading: engineLoading } = useEngineAccess();
  const { progression, loading: progressionLoading } = useNextBestActions(user?.id);
  const location = useLocation();

  const loading =
    authLoading ||
    (user &&
      (talentLoading ||
        (engineKey && engineLoading) ||
        (minStage && progressionLoading)));

  if (loading) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  const reasons: string[] = [];
  if (talentGate && !talentReady) reasons.push("talent");
  if (engineKey && !engines[engineKey].unlocked) reasons.push(`engine-${engineKey}`);
  if (orgAdminOnly && !isOrgAdmin) reasons.push("org-admin");
  if (minStage) {
    const currentRank =
      STAGE_RANK[(progression?.current_state as Stage) ?? "novice"] ?? 0;
    if (currentRank < STAGE_RANK[minStage]) reasons.push(`stage-${minStage}`);
  }

  if (reasons.length > 0) {
    // Org-admin-only surfaces redirect to /organizations so the user can
    // become an admin; everything else bounces to the dashboard with a hint.
    const fallback =
      orgAdminOnly && !isOrgAdmin
        ? "/organizations?gated=org-admin"
        : `/dashboard?gated=${reasons[0]}&from=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={fallback} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
