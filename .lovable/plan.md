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

### Phase 1 completion criteria (Gates 1 + 2 enforced)
- [x] Versioned event catalog (`event_catalog` table, seeded v1 contracts)
- [x] Idempotent event processing (`graph_events.idempotency_key` unique)
- [x] `graph_events` populated
- [x] `graph_nodes` populated (via async worker)
- [x] `graph_edges` populated (via async worker)
- [x] `expertise_graph` projection populated (with `score_breakdown` explainability)
- [ ] Wave 1 emitters live (skills, certifications, startup acceptance — **shipped**; verify in prod)
- [x] Projection explainability available (`score_breakdown` jsonb)
- [ ] UI consuming `expertise_graph` (blocked on parity)
- [ ] Parity tests passing (edge fn `expertise-parity-check`, criterion: `fail === 0`)

### Shipped
- Migration 1: `graph_events`, `graph_nodes`, `graph_edges`, `expertise_graph`, helper RPCs.
- Migration 2 (safeguards): `event_catalog` + seed, `event_version`, unique `idempotency_key`, validation trigger, `score_breakdown`, `legacy_expertise_calc` parity helper.
- Edge fn `project-graph-events` — async worker, DLQ-safe.
- Edge fn `expertise-parity-check` — gates UI migration.
- `src/lib/graph.ts` — `emitGraphEvent()` + `idemKey()` (version + key REQUIRED).
- `src/hooks/useExpertise.tsx` — only allowed read path.
- **Wave 1 emitters wired** (highest expertise signal first):
  - `SkillTagPicker.tsx` → `skill_added` / `skill_removed`
  - `AdminLearningJourneysTab.tsx` → `certification_verified` + `journey_completed`
  - `IdeaApplicationsViewer.tsx` (acceptance) → `startup_contribution_accepted` + `startup_member_added`

### Remaining in Phase 1
1. Schedule the worker via `pg_cron` (every minute) hitting `project-graph-events`.
2. Backfill: synthesize idempotent v1 events from existing `user_skills`, `user_certifications`, `startup_team_members`.
3. Run `expertise-parity-check` against ≥25 users; require `ready_for_ui_migration: true`.
4. Only then swap UI read sites to `useExpertise()`:
   - `DashboardStats.tsx`, `Profile.tsx`, `CoBuilders.tsx`, `OpportunityCard.tsx`.

### Wave 2 (after Phase 1 closes)
- `consulting_services` published/completed
- `training_opportunities` published/delivered
- `tenders` published/won

### Wave 3
- `job_opportunities` published/applied
- Career achievements
- Future transaction events (deferred to Phase 4)


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
