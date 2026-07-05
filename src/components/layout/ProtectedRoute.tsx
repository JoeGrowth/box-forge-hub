import { ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccessLevel, AccessLevel } from "@/hooks/useAccessLevel";
import { Skeleton } from "@/components/ui/skeleton";

// P0 — Single auth guard. No more per-page useEffect redirects that
// flash content before bouncing to /auth.

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Minimum access level required. Default: "any" signed-in user (pending+). */
  requireLevel?: "any" | "approved" | "admin";
  /** Where to send unauthorized users. Defaults to /auth with ?next= preserved. */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireLevel = "any",
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { level, loading } = useAccessLevel();
  const location = useLocation();

  if (authLoading || loading) {
    // Neutral placeholder — no skeleton cards. Skeletons that render then
    // immediately unmount (because auth resolves synchronously most of the
    // time) create a visible flash before the real page paints.
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={redirectTo ?? `/auth?next=${next}`} replace />;
  }

  const meets =
    requireLevel === "any"
      ? true
      : requireLevel === "approved"
      ? level === "approved" || level === "admin"
      : level === "admin";

  if (!meets) {
    // Pending user trying to reach approved-only surface → bounce to dashboard
    // with a hint, never to /auth (they ARE signed in).
    return <Navigate to="/dashboard?gated=1" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
