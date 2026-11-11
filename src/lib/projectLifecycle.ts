// Project lifecycle: six steps, each worth a fixed share of progress.
// Progress is the sum of completed steps; the current step is the first one not completed.
export const LIFECYCLE_STEPS = [
  { n: 1, label: "Opportunity", hint: "A team identifies a commercial opportunity.", weight: 10 },
  { n: 2, label: "Proposal", hint: "The opportunity becomes a commercial proposal.", weight: 10 },
  { n: 3, label: "Project & mission", hint: "The work is structured and assigned.", weight: 20 },
  { n: 4, label: "Budget distribution", hint: "The contributors and their allocations are defined.", weight: 10 },
  { n: 5, label: "Delivery", hint: "The team executes the work.", weight: 20 },
  { n: 6, label: "Earnings", hint: "Contributors can see what they are owed and what they have received.", weight: 30 },
] as const;

/** Progress % once the first `completed` steps are done. */
export function progressForCompleted(completed: number): number {
  const c = Math.max(0, Math.min(LIFECYCLE_STEPS.length, Math.floor(completed)));
  return LIFECYCLE_STEPS.slice(0, c).reduce((s, x) => s + x.weight, 0);
}

/** Number of fully completed steps for a stored progress value. */
export function completedFromProgress(progress: number): number {
  let c = 0;
  for (let i = 1; i <= LIFECYCLE_STEPS.length; i++) {
    if ((progress ?? 0) >= progressForCompleted(i)) c = i;
  }
  return c;
}

/** Current (in-progress) step number 1..6, or null when all are done. */
export function currentStep(progress: number): number | null {
  const c = completedFromProgress(progress);
  return c >= LIFECYCLE_STEPS.length ? null : c + 1;
}
