import { useCallback, useEffect, useState } from "react";

// Saved = user intent only. LocalStorage-backed; never written to the graph.
// Applied (canonical) lives in opportunity_interactions.
const KEY = "b4.savedOpportunities.v1";

type Entry = { id: string; category: string; savedAt: string };

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("b4:saved-opps-changed"));
  } catch {
    /* quota or disabled storage — silent */
  }
}

export function useSavedOpportunities() {
  const [entries, setEntries] = useState<Entry[]>(() => read());

  useEffect(() => {
    const handler = () => setEntries(read());
    window.addEventListener("b4:saved-opps-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("b4:saved-opps-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isSaved = useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries]
  );

  const toggle = useCallback(
    (id: string, category: string) => {
      const current = read();
      const exists = current.some((e) => e.id === id);
      const next = exists
        ? current.filter((e) => e.id !== id)
        : [...current, { id, category, savedAt: new Date().toISOString() }];
      write(next);
      setEntries(next);
      return !exists;
    },
    []
  );

  const remove = useCallback((id: string) => {
    const next = read().filter((e) => e.id !== id);
    write(next);
    setEntries(next);
  }, []);

  return { savedIds: entries.map((e) => e.id), entries, isSaved, toggle, remove };
}
