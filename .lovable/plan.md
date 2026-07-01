# Optional Profile Linking for Entity Roles — FROZEN

Establishes verified identity and reproducible attribution for entity slots (Associé 1/2, Internal Structure Handler, Internal Process Handler, and future roles) without ever writing directly into scoring graphs. Downstream graphs consume immutable, self-contained events across four separated streams.

## Principles

- Immutable event history.
- Projections as derived state; graphs never mutated directly.
- Historical reproducibility contained inside events, not relational lookups.
- Temporal correctness via time-scoped assignments and event-time resolution.
- **Relationship state and activity attribution are separate streams.** Ownership is relationship-state, not activity-derived.
- Labels always visible; profile linking always optional; two-sided confirmation before any graph effect.

## Four immutable streams (platform-wide)

```text
Identity                Activity                  Progress               Opportunity
--------                --------                  --------               -----------
role.link.*             contribution.*            commitment.*           opportunity.*
affiliation.*           revenue.attributed        milestone.*            negotiation.*
ownership.edge.*        expertise.attributed      relationship.*         application.*
                        trust.attributed
```

All graphs are projections over these streams. Reputation projects over multiple streams.

## Bounded contexts touched by this feature

```text
Entity Role Assignment          Affiliation                    Ownership (relationship state)
        │                            │                                │
        ├── role.link.requested      ├── affiliation.started         ├── ownership.edge.created
        ├── role.link.accepted       └── affiliation.ended           └── ownership.edge.ended
        ├── role.link.declined                                         (emitted from OWNER role transitions)
        └── role.link.revoked

Attribution Engine (activity)
        │
        ├── consumes domain events + active assignments + resolved policy
        └── emits self-contained revenue.attributed / expertise.attributed / trust.attributed
```

- Role assignments, affiliations, and ownership edges are decoupled. Today the domain service emits `role.link.accepted` + `affiliation.started` + (for OWNER) `ownership.edge.created` in one transaction; tomorrow contractor / alumni / share transfer / inheritance can emit `affiliation.*` or `ownership.edge.*` without a role row.
- **Ownership graph projects from `ownership.edge.*` only.** It does not consume attribution events.
- Revenue / expertise / trust graphs consume attribution events. They may reference ownership information via join at read time, but ownership itself never depends on activity.

## Data model

Generalized across entity types (declaration_entity, organization, startup, box, accelerator, ...).

```text
role_types                     (reference — behavior)
----------
code            OWNER | OPERATOR | ADVISOR | BOARD_MEMBER | LEGAL_REPRESENTATIVE | ...

role_catalog                   (reference — presentation, versioned)
------------
id, role_slug, role_type, default_label, applies_to,
effective_from, effective_until nullable, version
UNIQUE (role_slug, version)

entity_role_assignments        (source of truth)
-----------------------
id, entity_type, entity_id, role_slug, slot, label,
linked_user_id nullable, equity_pct nullable,
status (pending|accepted|declined|revoked),
linked_by, linked_at, accepted_at, revoked_at,
effective_from (= accepted_at), effective_until (= revoked_at, nullable)

role_attribution_policy        (versioned, time-scoped)
-----------------------
id, role_type, ownership_weight, expertise_weight,
revenue_weight, trust_weight,
effective_from, effective_until nullable, version

attribution_events             (immutable, self-contained, activity stream)
-----------------
id
event_type                     revenue.attributed | expertise.attributed | trust.attributed
source_event_id
source_event_type
occurred_at                    source event time
entity_type, entity_id
user_id
assignment_id                  reference only
role_slug, role_type           captured at attribution
policy_version                 captured
ownership_weight               resolved weights persisted
revenue_weight
expertise_weight
trust_weight
equity_pct                     captured
amount, currency               nullable
payload                        jsonb
processing_state               queued | processed | failed
failure_reason                 nullable
idempotency_key                <source_event_id>:<assignment_id>:<event_type>:<policy_version>
attributed_at
UNIQUE (idempotency_key)

ownership_edges                (identity stream — projection of ownership.edge.*)
---------------
profile_id, entity_type, entity_id,
equity_pct, effective_from, effective_until nullable, active,
source_assignment_id nullable

verified_affiliations          (identity stream — projection of affiliation.*)
---------------------
profile_id, entity_type, entity_id, role_slug, role_type,
verified_since, verified_until nullable, active

entity_role_audit_log
---------------------
assignment_id, transition, actor_user_id, at, payload
```

### Frozen modeling choices

- **No `assignment_snapshots` table.** The attribution event is the snapshot — embeds `role_slug`, `role_type`, `equity_pct`, `policy_version`, and every resolved weight.
- **Ownership is state-derived**, projected from `ownership.edge.*` events. Never carried in `attribution_events`.
- **`processing_state`** (`queued | processed | failed`) — the event's mere existence already means attribution occurred; this field describes delivery, not domain semantics.
- **Idempotency key includes `event_type`** so multi-output attribution (revenue + expertise from one source event) does not collide.
- **`role_catalog` is versioned** — renaming "Internal Process Handler" → "Operations Lead" adds a new version; historical events resolve the historically correct label.
- Policies key on `role_type`, not `role_slug` — `associe_1` and `associe_2` share one `OWNER` policy.

## Lifecycle

Domain service performs auth → validation → persistence → event emission in one transaction.

```text
requested ── role.link.requested
    │
    ├── accepted ── role.link.accepted
    │       │           ├── (same tx) affiliation.started
    │       │           └── (same tx, if role_type = OWNER) ownership.edge.created
    │       │
    │       └── revoked ── role.link.revoked
    │                          ├── (same tx) affiliation.ended
    │                          └── (same tx, if role_type = OWNER) ownership.edge.ended
    │
    └── declined ── role.link.declined
```

## Attribution engine (activity only)

```text
domain event (revenue declared, mission completed, ...)
        │
        ▼
Attribution Engine
   1. select accepted assignments where
        effective_from ≤ event.occurred_at < COALESCE(effective_until, ∞)
   2. resolve role_catalog version and policy version at event.occurred_at
   3. per output event_type (revenue.attributed / expertise.attributed / trust.attributed):
        compute idempotency_key = <source>:<assignment>:<event_type>:<policy_version>
        insert attribution_event with resolved weights
        processing_state = processed | failed
        │
        ▼
Activity graphs recompute from attribution_events only
   ├── revenue_graph
   ├── expertise_graph
   └── trust_graph

Ownership graph recomputes from ownership.edge.* only
   └── ownership_graph

Reputation graph projects over both streams
   └── reputation_graph
```

## Invariants

- No graph effect without `status = accepted` on the assignment.
- Ownership graph never reads `attribution_events`. Revenue / expertise / trust graphs never read `entity_role_assignments` for weights or labels.
- Holding a role ≠ activity contribution. Activity graphs move only on attributed domain events.
- Strict time overlap for attribution: `effective_from ≤ T < COALESCE(effective_until, ∞)`.
- Attribution event self-contained; graphs never join back to `role_attribution_policy` / `role_catalog` for weights or labels.
- Idempotency key uniqueness: at-most-once per (source event, assignment, event_type, policy version).
- Revocation ≠ deletion. Historical events remain valid; `ownership.edge.ended` closes the edge going forward.
- Unique active role per (entity, linked_user_id) where `status = accepted`; overridable by platform-admin flag.
- Σ `equity_pct` ≤ 100 across accepted OWNER assignments per entity.
- `equity_pct` flows into ownership via `ownership.edge.*`; not into activity attribution weights.

## RLS

- Entity admins: request / revoke on entities they administer.
- Linked user: accept / decline own pending row.
- Assignment rows readable by entity members and linked user.
- `role_types`, `role_catalog`, `role_attribution_policy`: read to authenticated; write to platform admins.
- `verified_affiliations`, `ownership_edges`: follow existing profile visibility.
- `attribution_events`: readable to owning user and entity admins; write only via engine (service role).

## UI (`/declaration` entity view)

Labels preserved verbatim (Associé 1 (70%), Associé 2 (30%), Internal 1 – Structure Handler, Internal 2 – Process Handler).

Chip per label:
- Unlinked → "Link profile" (entity admin).
- Pending → target user + "Awaiting acceptance".
- Accepted → avatar + verified check + "Unlink".
- Declined / revoked → muted status.

Linking dialog: user search, optional `equity_pct` for OWNER slots.
Notifications inbox: accept / decline.
Public profile / `/profile`: "Verified affiliations" from `verified_affiliations`; "Ownership" from `ownership_edges`.

## Delivery steps

1. Migration: `role_types`, `role_catalog` (versioned), `entity_role_assignments`, `role_attribution_policy`, `attribution_events` (idempotency key includes event_type, `processing_state`), `verified_affiliations`, `ownership_edges`, `entity_role_audit_log`. Grants, RLS, triggers for `updated_at` / uniqueness / equity sum. Seed role types, initial catalog version for the four declaration slots, initial OWNER / OPERATOR policy version.
2. Postgres helpers: `resolve_catalog(role_slug, at)`, `resolve_policy(role_type, at)`, `active_assignments(entity_id, at)`, `attribute_event(source_event_id)`.
3. Recompute functions for `revenue_graph`, `expertise_graph`, `trust_graph`, `verified_affiliations`, `ownership_graph` — each reading exclusively from its own stream.
4. Domain service (SECURITY DEFINER): `request_link`, `accept_link`, `decline_link`, `revoke_link` — auth, persist, audit, emit `role.link.*` + `affiliation.*` + (if OWNER) `ownership.edge.*` in one transaction.
5. Attribution job on new domain event → invoke `attribute_event` → invalidate dependent activity projections.
6. Hook `useEntityRoleAssignments(entityType, entityId)`.
7. UI: role chip, linking dialog with user search, accept/decline in notifications inbox.
8. Public profile: "Verified affiliations" and "Ownership" sections.
9. Backfill: unlinked `entity_role_assignments` (label only) for existing entities.
10. Ops surface: admin view over `attribution_events` filtered by `processing_state = failed` for triage.

## Non-goals (frozen boundary)

- No `assignment_snapshots` table.
- No ownership attribution via `attribution_events`.
- No fixed `+N` linking bonus.
- No direct writes from role tables into graphs.
- No mandatory linking.
- No retroactive policy application.
- No graph reads against mutable relational state for weights or labels.
- No further core abstractions. Future work is limited to projections, UI, operational tooling, and policy calibration.
