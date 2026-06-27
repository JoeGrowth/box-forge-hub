// Lightweight click telemetry. Fire-and-forget inserts to public.click_events.
import { supabase } from "@/integrations/supabase/client";

export type ClickKind = "navbar" | "button" | "link";

export async function trackClick(args: {
  label: string;
  kind?: ClickKind;
  targetPath?: string | null;
  pagePath?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("click_events").insert({
      user_id: user?.id ?? null,
      page_path: args.pagePath ?? window.location.pathname,
      label: args.label.slice(0, 200),
      kind: args.kind ?? "button",
      target_path: args.targetPath ?? null,
    });
  } catch {
    // silent
  }
}
