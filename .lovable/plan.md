# Phase 5 — Product Integration

Goal: make the existing graph perceivable. No new core entities. All work goes into surfaces, projections, and consistent mounting of what already exists.

Sequenced in 6 sprints so each lands a usable surface before moving on.

---

## Sprint 5A — Opportunities surface (highest priority)

Rebuild `/opportunities` as the canonical entry point to the Opportunity Graph.

Tabs:
- **Discover** — all live opportunities, filterable by kind (job, startup, training, consulting, tender, advisor invite, partnership, hiring, investment, collaboration, co_builder).
- **Recommended** — ranked feed from `opportunity_graph` + `opportunities` ranking.
- **My Opportunities** — relationships I'm already in (active commitments / accepted apps).
- **My Applications** — `opportunity_applications` + legacy `startup_applications` unioned.
- **Created by Me** — opportunities I own (and legacy ideas/jobs/etc. I authored).

Each card answers the 4 questions:
1. **What** — title, kind badge, sector, one-line summary.
2. **Why recommended** — evidence chips (matched skills, shared box, shared relationships, contribution overlap) — no numeric weights.
3. **Evidence expected** — what the applicant needs to bring (skills, validated contributions, canvas).
4. **Resulting relationship** — `relationship_kind` that would form on acceptance (advisor, teammate, partner…).

New components:
- `src/pages/Opportunities.tsx` — restructured with the 5 tabs above (replace current tab system).
- `src/components/opportunities/OpportunityCardV2.tsx` — 4-question layout. Wraps existing card data.
- `src/components/opportunities/WhyRecommended.tsx` — evidence chips from `OpportunityRecommendation.explanation`.
- `src/components/opportunities/ExpectedEvidence.tsx`.
- `src/components/opportunities/ResultingRelationship.tsx`.

## Sprint 5B — TrustBlock mount sweep

Mount `TrustBlock` (compact variant) wherever a person renders. Add a `compact` prop to `TrustBlock` if missing.

Surfaces to patch:
- `TeamManagementDialog` applicant rows
- `OpportunityCardV2` author row
- `CompensationDialog` header
- `AdvisorWorkQueue` requester row
- `BoxAdvisorStrip` advisor chips
- `Chat` header (`Chat.tsx`, `DirectChat.tsx`)
- `PublicProfile` header
- `IdeaApplicationsViewer` rows
- `CoBuilderApplicationsSection`

## Sprint 5C — Relationship-first profile

Rework `PublicProfile.tsx` into a tabbed shell:
```
Summary | Contributions | Relationships | Opportunities | Track Record | Trust
```
- **Summary** — generated from graph (TrustBlock + top 3 contributions + active relationship counts).
- **Contributions** — list from `contributions`.
- **Relationships** — `RelationshipTimeline` aggregated across all relationships.
- **Opportunities** — created + open applications.
- **Track Record** — existing track record export.
- **Trust** — full TrustBlock + evidence list.

No new tables. Pure presentation.

## Sprint 5D — Recommendation explanations everywhere

Generalize `RecommendationExplanation` so it renders the same evidence-chip set used by `WhyRecommended`. Mount on:
- Opportunity recommendation cards (already partial)
- Advisor matching results in `BoxAdvisorStrip` / `AdvisorWorkQueue`
- Team member search results in `TeamMemberSearch`
- Dashboard top matches

## Sprint 5E — Unified activity stream

One projection feeding many views.

Schema (additive, projection only — no new core entities):
```sql
create view public.activity_stream as
  select 'opportunity'::text as entity_type, opportunity_id as entity_id,
         actor_user_id as actor_id, event_type::text, occurred_at,
         coalesce((payload->>'importance')::int, 3) as importance
  from public.graph_events
  where event_type::text like 'opportunity.%'
  union all
  select 'commitment', commitment_id, owner_user_id, event_type::text, occurred_at, 3
  from public.graph_events where event_type::text like 'commitment.%'
  union all
  select 'contribution', contribution_id, contributor_user_id, 'contribution.recorded', created_at, 2
  from public.contributions
  union all
  select 'milestone', id, owner_user_id, 'milestone.reached', reached_at, 4
  from public.milestones where reached_at is not null
  union all
  select 'relationship', id, initiator_user_id, 'relationship.formed', created_at, 3
  from public.advisor_relationships;
```
(Real SQL will resolve actual column names during implementation.)

Grants: `grant select on public.activity_stream to authenticated, service_role;`

Consumers — refactor to read from the view with filters:
- `DashboardActivity` (new) — personal + relationships
- `BoxFeed` — filter by box
- Opportunity detail timeline — filter by `entity_id`
- `PublicProfile > Relationships` tab — filter by actor

## Sprint 5F — Beta operations console

Extend `BetaConsole` with operational metrics:
- advisor capacity utilization (active / capacity from `box_advisors`)
- median request response time (`box_inbound_requests` accepted_at − created_at)
- opportunity fill rate (accepted apps / opportunities)
- commitment completion rate (`commitments` status='completed' / total)
- relationship formation rate (new relationships / week)
- validated contributions / week
- verified contributors in last 30 days

Add to `get_admin_beta_health` RPC.

---

## Out of scope (frozen)

- No new core entities. Only event types / projections / views.
- No ranking-weight exposure to end users.
- No payments, no scoring redesign.

## Order of execution

1. 5A Opportunities surface
2. 5B TrustBlock sweep
3. 5D Recommendation explanations (small, ride alongside 5B)
4. 5C Relationship-first profile
5. 5E Activity stream view + Dashboard/Box/Profile consumers
6. 5F Beta ops console

Each sprint is shippable independently.
