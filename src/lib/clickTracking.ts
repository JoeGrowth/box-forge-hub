// Lightweight click telemetry, batched: clicks are queued in memory and
// written in a single insert every 15s (or when the tab is hidden) instead
// of one database write per click.
import { supabase } from "@/integrations/supabase/client";

export type ClickKind = "navbar" | "button" | "link";

type Row = {
  user_id: string | null;
  page_path: string;
  label: string;
  kind: ClickKind;
  target_path: string | null;
};

const queue: Row[] = [];
const MAX_QUEUE = 50;
let timer: number | null = null;
let lastKey = "";
let lastAt = 0;

async function flush() {
  if (timer) { window.clearTimeout(timer); timer = null; }
  if (queue.length === 0) return;
  const rows = queue.splice(0, queue.length);
  try {
    await supabase.from("click_events").insert(rows);
  } catch {
    // silent — telemetry must never affect the app
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export async function trackClick(args: {
  label: string;
  kind?: ClickKind;
  targetPath?: string | null;
  pagePath?: string;
}) {
  try {
    const page = args.pagePath ?? window.location.pathname;
    const key = `${page}|${args.label}`;
    const now = Date.now();
    // Ignore repeated clicks on the same element within 3s.
    if (key === lastKey && now - lastAt < 3000) return;
    lastKey = key;
    lastAt = now;

    // Local session read — no network round-trip.
    const { data: { session } } = await supabase.auth.getSession();
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({
      user_id: session?.user?.id ?? null,
      page_path: page,
      label: args.label.slice(0, 200),
      kind: args.kind ?? "button",
      target_path: args.targetPath ?? null,
    });
    if (!timer) timer = window.setTimeout(flush, 15000);
  } catch {
    // silent
  }
}
