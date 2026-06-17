// Phase 1 cutover flag. Kept hard-coded `true` post-cutover so that the
// expertise-graph projection is the only path. Flip back only for emergency
// rollback to legacy table reads (which still exist in admin/write paths).
export const USE_EXPERTISE_GRAPH = true;

// Phase 2 — Trust Graph is the single trust source.
export const USE_TRUST_GRAPH = true;

// Phase 3 — Opportunity Graph. When true, opportunity feed sorts by the
// computed match_score in opportunity_graph instead of per-module heuristics.
export const USE_OPPORTUNITY_GRAPH = true;

// Phase 4 — Revenue Graph. When true, revenue/transaction UI sources from
// the revenue_graph projection and the canonical transactions table.
export const USE_REVENUE_GRAPH = true;

// Phase 5 — Reputation Graph. Synthesis layer over Expertise + Trust + Revenue.
// When true, Profile renders a unified Professional Reputation Snapshot and
// opportunity cards expose a candidate reputation indicator.
export const USE_REPUTATION_GRAPH = true;

// Phase 6 — Ownership Graph. Equity is a first-class entity (allocations,
// vesting schedules, immutable ledger). UI reads ownership_graph projection.
export const USE_OWNERSHIP_GRAPH = true;

// Phase 7 — Progression Engine. Control layer that synthesizes all six
// graphs into next-best-action recommendations. When true, DashboardNextSteps
// and the Profile growth path consume progression_graph instead of any
// component-local heuristic.
export const USE_PROGRESSION_ENGINE = true;

// Phase 8 — Autonomous Growth Loops. Execution layer over the Progression
// Engine: rule-driven dispatch turns recommendations into notifications,
// scheduled engagement, and conversion-tracked runs. When true, the worker
// dispatches loops after every projection cycle and the UI surfaces the
// triggered runs + feedback controls.
export const USE_GROWTH_LOOPS = true;
