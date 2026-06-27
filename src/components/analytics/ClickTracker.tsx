import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackClick } from "@/lib/clickTracking";

/**
 * Global click listener. Records taps on buttons, links, and role=button
 * elements anywhere in the app. Uses a single capture-phase listener so
 * pages don't need to opt-in.
 *
 * To force-skip an element, add data-no-track. To override the auto label,
 * add data-track-label="My Label". To mark an element as navbar-origin
 * (used by the analytics dashboard), add data-track-kind="navbar".
 */
export function ClickTracker() {
  const location = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>(
        "button, a, [role='button'], [data-track-label]",
      );
      if (!el) return;
      if (el.closest("[data-no-track]")) return;

      const explicitLabel = el.getAttribute("data-track-label");
      const rawLabel = (explicitLabel ?? el.getAttribute("aria-label") ?? el.innerText ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!rawLabel) return;

      const kindAttr = el.getAttribute("data-track-kind") as
        | "navbar"
        | "button"
        | "link"
        | null;
      const tag = el.tagName.toLowerCase();
      const kind = kindAttr ?? (tag === "a" ? "link" : "button");
      const targetPath =
        el.getAttribute("href") ?? el.getAttribute("data-track-target") ?? null;

      void trackClick({
        label: rawLabel.slice(0, 80),
        kind,
        targetPath,
        pagePath: location.pathname + location.search,
      });
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [location.pathname, location.search]);

  return null;
}
