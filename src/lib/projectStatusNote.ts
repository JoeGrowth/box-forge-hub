// Builds the "Blocker / where it stands" line for a project from what was delivered and the budget.
// Pure helpers so the wording and the arithmetic can be tested without the form.

/** Days between two YYYY-MM-DD (or ISO) dates, or null when one is missing or the span is negative. */
export function daysBetween(a?: string | null, b?: string | null): number | null {
  const day = (s?: string | null) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((s ?? "").trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const start = day(a);
  const end = day(b);
  if (start === null || end === null) return null;
  const days = Math.round((end - start) / 86_400_000);
  return days >= 0 ? days : null;
}

export type StatusNoteInput = {
  /** Name of the product being delivered, if any. */
  productName?: string | null;
  /** Project start date (YYYY-MM-DD). */
  startDate?: string | null;
  /** Project target date (YYYY-MM-DD). */
  targetDate?: string | null;
  /** Fallback length: span of the product's shipped deliveries, in days. */
  deliverySpanDays?: number | null;
  /** Project budget; 0, blank or non-numeric is left out. */
  budget?: number | string | null;
  currency?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** One readable line: what was delivered, how long it took, and the budget. Empty when nothing is known. */
export function buildStatusNote(input: StatusNoteInput): string {
  const parts: string[] = [];

  const product = (input.productName ?? "").trim();
  if (product) parts.push(product);

  const projectDays = daysBetween(input.startDate, input.targetDate);
  const days = projectDays ?? (input.deliverySpanDays != null && input.deliverySpanDays >= 0 ? input.deliverySpanDays : null);
  if (days != null && days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);

  const budget = typeof input.budget === "string" ? Number(input.budget) : input.budget;
  if (budget != null && Number.isFinite(budget) && budget > 0) {
    parts.push(`Budget ${money(budget)} ${input.currency ?? "TND"}`);
  }

  return parts.join(" · ");
}
