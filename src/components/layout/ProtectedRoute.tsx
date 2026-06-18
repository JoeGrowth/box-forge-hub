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
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-48 w-full rounded-2xl mb-6" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
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
