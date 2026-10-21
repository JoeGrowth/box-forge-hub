import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { activityPagePath } from "@/lib/activityLog";

export function ActivityTracker() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user) return;
    const page = activityPagePath(pathname);
    if (!page) return;
    const record = () => {
      if (document.visibilityState !== "visible") return;
      // Analytics cannot interrupt navigation. The server deduplicates visits
      // and derives the actor and return classification, never the browser.
      void supabase.rpc("record_platform_visit", { _page_path: page }).then(
        () => undefined,
        () => undefined,
      );
    };
    const timer = window.setTimeout(record, 700);
    document.addEventListener("visibilitychange", record);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", record);
    };
  }, [user?.id, pathname]);

  return null;
}