export interface ActivityLogEvent {
  id: string;
  user_id: string;
  user_name: string;
  occurred_at: string;
  kind: "visit" | "click" | "event";
  action: string;
  page_path: string | null;
}

export interface ActivityLogUser {
  user_id: string;
  user_name: string;
  last_seen: string;
  actions: number;
  visits: number;
  returns: number;
}

export interface ActivityLogData {
  stats: { active_users: number; returning_users: number; visits: number; actions: number };
  users: ActivityLogUser[];
  events: ActivityLogEvent[];
  total: number;
  tracking_since: string | null;
}

// Do not retain conversation IDs or recovery tokens in usage telemetry.
export function activityPagePath(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0];
  if (!path?.startsWith("/") || path.startsWith("//")) return null;
  if (["/auth", "/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return null;
  if (path.startsWith("/messages/")) return "/messages";
  if (path.startsWith("/chat/")) return "/chat";
  return path.slice(0, 250);
}