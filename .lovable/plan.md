# Implementation Plan — Graph-First Sequencing

Supersedes the previous Stripe-first plan. The platform's moat is the
**Expertise Graph**, not transactions. Payments come *after* intelligence.

## Architecture

```text
module action
   ↓
graph_events  (append-only log, processed_at for replay / dead-letter)
   ↓
async worker  (edge fn: project-graph-events, scheduled)
   ↓
graph_nodes + graph_edges  (canonical typed graph)
   ↓
projections  (expertise → trust → opportunity → revenue → reputation → ownership)
   ↓
progression engine  (next-best-action recommendations)
```

Every projection is a materialized view over nodes/edges. No new graph
becomes another silo because all of them derive from the same primitives.

## Phase sequence

| # | Phase                  | Status      | Gate to next phase                                                   |
|---|------------------------|-------------|----------------------------------------------------------------------|
| 1 | **Expertise Graph**    | in progress | Every source module emits events; UI reads only `expertise_graph`.   |
| 2 | Trust Graph            | next        | Reviews + verifications + milestones materialized as edges.          |
| 3 | Opportunity Graph      | queued      | Unified `opportunity_match` projection across jobs/training/etc.     |
| 4 | Revenue Graph          | queued      | Stripe + contracts + payments + invoices.                            |
| 5 | Reputation Graph       | queued      | Composite of Expertise + Trust + Revenue + Ownership.                |
| 6 | Ownership Graph        | queued      | Promote equity from JSON to first-class entity.                      |
| 7 | Progression Engine     | queued      | `progression_rules` + `next_best_action` RPC.                        |

## Phase 1 — Expertise Graph (current)

### Shipped this turn
- Migration: `graph_events`, `graph_nodes`, `graph_edges`, `expertise_graph`,
  helper RPCs (`graph_upsert_node`, `graph_upsert_edge`, `recompute_expertise`).
- Edge function: `project-graph-events` — async worker, idempotent, with
  per-event `processed_at` / `processing_error` for replay and DLQ.
- Client helper: `src/lib/graph.ts` — `emitGraphEvent()` fire-and-forget.
- React hook: `src/hooks/useExpertise.tsx` — only allowed read path.

### Remaining in Phase 1
1. **Wire emitters into the 8 source modules** at their existing write sites:
   - `src/components/profile/SkillTagPicker.tsx` → `skill_added` / `skill_removed`
   - `src/components/admin/AdminApprovalsTab.tsx` → `certification_verified`
   - Learning journey completion paths → `certification_earned` / `journey_completed`
   - `src/components/idea/TeamManagementDialog.tsx` (accept applicant) → `startup_contribution_accepted` / `startup_member_added`
   - `src/components/consulting/CreateServiceDialog.tsx` → `consulting_service_published`
   - `src/components/resume/TrainTeamDialog.tsx` / `PublishTraining.tsx` → `training_published`
   - `src/pages/PublishJob.tsx` → `job_published`
   - `src/pages/Procuring.tsx` (tender publish/win) → `tender_published` / `tender_won`
2. **Schedule the worker** via `pg_cron` every minute hitting
   `project-graph-events`.
3. **Backfill** synthetic events from existing rows (one migration), so
   day-one users land with a non-zero `expertise_graph`.
4. **Swap UI read sites** to `useExpertise()`:
   - `src/components/dashboard/DashboardStats.tsx`
   - `src/pages/Profile.tsx` skills/expertise sections
   - `src/pages/CoBuilders.tsx` ranking badge
   - `src/components/opportunities/OpportunityCard.tsx` match preview
5. **Acceptance audit (architectural, not numerical):**
   - `rg "from\\(['\"]user_skills['\"]\\)" src/` returns only the
     `emitGraphEvent` adapters and the Skill picker write path.
   - `rg "from\\(['\"]user_certifications['\"]\\)" src/` same constraint.
   - Every wired module shows a `graph_events` row within 5s of action.

## Out of scope until Phase 1 is closed
- Stripe / billing / subscriptions
- Reputation composites
- Cap tables / vesting entities
- `next_best_action` engine

## Risks
| Risk | Mitigation |
|---|---|
| Event volume grows unbounded | `processed_at` index + periodic archival to cold table |
| Projection drift after worker outage | Worker is idempotent; replay = clear `processed_at` and re-run |
| Race between emit and projection | UI reads always show last computed; banner if `computed_at` > 5 min ago |
| Schema churn during Phase 2 (Trust) | Trust = new edge types + new projection; **no changes** to nodes/edges/events schema |
