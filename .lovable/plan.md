## Goal

Ship the **Growth Journey** layer (Consulting Growth + Brand Growth) on top of Professional Foundation. Bounded contexts, event-driven progression, fully normalized registries, service-function API boundary. Future stages plug in as data.

## Bounded contexts

```text
Identity      organizations, organization_members, role_catalog, entity_role_assignments,
              platform_partners, platform_principals
Consulting    consultant_opportunities, consultant_missions,
              consultant_opportunity_statuses, consultant_mission_statuses
Accounting    declaration_entities, declaration_missions
Progression   progression_rules, progression_predicates, progression_rule_predicates,
              progression_milestones, progression_graph
Graph         graph_events   (edge fn already recomputes progression on every event)
```

## Naming

| Surface | Text |
|---|---|
| Dashboard section | "Your Growth Journey" |
| Stage A · B | `consulting_growth` "Consulting Practice" · `brand_growth` "Brand" |
| Cards | "Grow your consulting practice" · "Launch your brand entity" |

## Bootstrap (out of migration)

`scripts/seed-system-principal.ts` (run once per env, service key) creates the system auth user and inserts `platform_principals('system', <user_id>, …)`. Migration `RAISE EXCEPTION` if that row is absent.

## Database migration (single file)

### 1. Identity

**`platform_principals`** `(id, slug UNIQUE, user_id uuid NOT NULL REFERENCES auth.users, description, created_at)` — GRANT auth read, service_role write.

**`platform_partners`**
```
id, slug UNIQUE, organization_id → organizations(id),
relationship_type text CHECK IN
  ('inspiring_advisor','legal','accounting','insurance','university','accelerator','other'),
default_assignment_role text, priority int NOT NULL, active boolean DEFAULT true
```
`get_default_partner(_relationship_type)` → deterministic `ORDER BY priority ASC, slug ASC LIMIT 1`.

**Seed B4** using `platform_principals.system.user_id` → org `(slug='b4', type='system', state='active')` → partner row.

**`organizations`** — add `state text NOT NULL DEFAULT 'draft' CHECK IN ('draft','forming','validation','active','paused','closed')`. Trigger auto-adds `created_by` to `organization_members` as `admin`.

**`role_catalog`** — insert `('inspiring_advisor','ADVISOR','Inspiring Advisor', ARRAY['organization'], now(), 1)`.

**`entity_role_assignments`** — add `started_at, ended_at, active bool DEFAULT true, assignment_reason text`.

### 2. Progression registries (fully normalized)

**`progression_predicates`** `(id, slug UNIQUE, handler text UNIQUE, arg_type text CHECK IN('none','int','text'), description)`.

**Static dispatcher** `evaluate_predicate(handler text, uid uuid, arg text) → boolean` — pure `CASE handler WHEN … END`. No dynamic SQL.

**`progression_milestones`**
```
id, slug UNIQUE, metric text, aggregation text CHECK IN ('COUNT','SUM','DISTINCT_COUNT','MAX'),
threshold int, scope text NOT NULL DEFAULT 'USER' CHECK IN ('USER','ORGANIZATION'), description
```

**`progression_milestone_progress(_uid, _slug)` → jsonb**
```json
{"slug":"first_ten_missions","current_value":7,"threshold":10,"percent_complete":70}
```
Frontend never computes percentages.

**`progression_rules`** — metadata only: `id, name UNIQUE, source_stage, target_stage, priority, action_type, action_payload jsonb, enabled bool`. **No `predicates jsonb`.**

**`progression_rule_predicates`** (junction)
```
id, rule_id → progression_rules(id) ON DELETE CASCADE,
predicate_id → progression_predicates(id) ON DELETE RESTRICT,
argument text, evaluation_order int NOT NULL,
UNIQUE (rule_id, evaluation_order)
```

`recompute_progression` joins the junction, iterates by `evaluation_order`, calls `evaluate_predicate` — short-circuits on first false. FK guarantees predicate existence.

### 3. Consulting (normalized statuses)

**`consultant_opportunity_statuses`**
```
slug PK, label, color, sort_order, is_terminal bool
```
Seed: `identified, contacted, proposal_sent, negotiation, won, closed_lost` (terminals: `won`, `closed_lost`).

**`consultant_mission_statuses`** — same shape. Seed: `scheduled, in_progress, delivered, accepted, paid, cancelled` (terminals: `paid`, `cancelled`).

**`consultant_opportunities`** — alter: `status text NOT NULL DEFAULT 'identified' REFERENCES consultant_opportunity_statuses(slug)`, `source text CHECK IN ('LINKEDIN','TENDER','REFERRAL','RETURNING_CLIENT','DIRECT','PARTNER','OTHER') DEFAULT 'OTHER'`, `proposal_url text`, `stage_updated_at timestamptz DEFAULT now()`.

**`consultant_missions`** — new
```
id, opportunity_id → consultant_opportunities ON DELETE CASCADE,
owner_id → auth.users, title text,
status text NOT NULL DEFAULT 'scheduled' REFERENCES consultant_mission_statuses(slug),
billing_model text CHECK IN ('daily_rate','fixed_fee','retainer') NOT NULL,
daily_rate numeric(12,2), number_of_days numeric(6,2), fixed_fee numeric(12,2),
currency_code char(3) NOT NULL DEFAULT 'USD',
subtotal numeric(12,2) NOT NULL,
started_at, delivered_at, accepted_at, paid_at,
declaration_mission_id → declaration_missions ON DELETE SET NULL,
notes text, created_at, updated_at
```
GRANT authenticated CRUD, service_role ALL. RLS owner-only.

**Client_id normalization** — add `client_id uuid` (nullable) on `consultant_opportunities` referencing a normalized `consultant_clients(id, owner_id, name, …)` table so "active clients" is unambiguous downstream.

### 4. Accounting

**`declaration_missions`** — add `consultant_mission_id uuid REFERENCES consultant_missions ON DELETE SET NULL`, `currency_code char(3)` (copied explicitly at declaration time), `client_id uuid` (copied from mission→opportunity).

### 5. Service-function API boundary

All writes to opportunities, missions, organizations, role assignments, and declarations go through service functions. Direct table writes from the client are blocked by RLS for these tables (owner-only SELECT; INSERT/UPDATE/DELETE via `service_role` inside `SECURITY DEFINER` functions only).

All service functions: `SECURITY DEFINER`, `SET search_path = public`, ownership validated internally.

**Transition legality** (whitelists inside the transition service functions, `is_terminal` protected):

```
opportunity: identified→contacted→proposal_sent→negotiation→won
             {negotiation,proposal_sent}→closed_lost
mission:     scheduled→in_progress→delivered→accepted→paid
             any→cancelled                        (owner)
             any→any                              (admin override, logged)
```

- `create_opportunity(_payload)` / `update_opportunity(_id,_patch)` / `transition_opportunity_status(_id,_next,_reason?)`
- `create_mission(_payload)` / `update_mission(_id,_patch)` / `transition_mission_status(_id,_next,_reason?)`
- `record_paid_mission(_mission_id)` — **idempotent**: `SELECT declaration_mission_id … FOR UPDATE`; if not null, return it; else transition to `paid`, ensure default `declaration_entity`, insert declaration copying `subtotal`, `currency_code`, `client_id`, back-link, emit `consulting.mission.paid` **exactly once**.
- `create_brand_entity(_uid,_brand_name)` — private helpers `_create_brand → _assign_members → _assign_partner → _ensure_declaration_entity → _attach_declaration_entity → _assign_roles → _emit_events`. Ends in `state='forming'`.
- `activate_brand_entity(_org_id)` → structured response:
  ```json
  {"activated": false, "state": "validation", "failures": ["declaration_entity_missing"], "warnings": []}
  ```
  On full pass → `state='active'`, emit `brand.activated`.

**Admin override audit** — new table
```
service_function_overrides
  id, function_name text, target_table text, target_id uuid,
  from_state text, to_state text,
  actor_id uuid, reason text NOT NULL, occurred_at timestamptz DEFAULT now()
```
`transition_*` functions insert here whenever the admin path is taken. Regular owner transitions do not write.

### 6. Progression rules (seeded via junction)

| rule name | predicates (in order) | target_stage | payload |
|---|---|---|---|
| `consulting_growth_start` | onboarding_completed | consulting_growth | "Grow your consulting practice" · `/consulting-growth` |
| `first_ten_missions_milestone` | milestone_reached:`first_ten_missions` | consulting_growth | "Reach 10 paid missions" · `/consulting-growth` |
| `brand_growth_start` | milestone_reached:`first_ten_missions`, brand_missing | brand_growth | "Launch your brand entity" · `/brand-entity` |

Consulting card keeps counting past 10 (next milestone `fifty_missions`).

### 7. Events

`graph_events` already has `id bigint identity, event_type, aggregate_type, aggregate_id, actor_id, occurred_at, payload`. **Ordering = `id`** for replay; `occurred_at` is display only. Every emitted event fills all identifiers.

Namespaced types:
```
consulting.opportunity.created / .stage_changed
consulting.mission.started / .delivered / .accepted / .paid / .cancelled
brand.created / .partner_assigned / .role_assigned / .activated
progression.stage_completed
```

### 8. Performance metric definitions (locked)

- **Revenue** = `SUM(declaration_missions.budget)` grouped by `currency_code`, only where `client_paid = true`.
- **Paid missions** = `COUNT(*) FROM declaration_missions WHERE owner=uid AND client_paid = true`.
- **Active clients** = `COUNT(DISTINCT client_id) FROM declaration_missions WHERE owner=uid AND client_paid = true AND paid_at >= now() - interval '12 months'`.
- **Avg daily rate** = `SUM(mission.subtotal) / SUM(mission.number_of_days) WHERE billing_model='daily_rate' AND status='paid'`.

## Frontend

1. **`src/pages/ConsultingGrowth.tsx`** — Pipeline · Delivery · Accounting · **Performance** (only from declarations; percentages come from `progression_milestone_progress`).
2. **`src/pages/BrandEntity.tsx`** — brand name form, partner preview via `get_default_partner('inspiring_advisor')`, calls `create_brand_entity` then `activate_brand_entity`. Renders `failures[]` and `warnings[]` distinctly.
3. **`DashboardNextSteps.tsx`** — "Your Growth Journey" title; Foundation / Growth / Future groups via stage→group map.
4. **Profile chips** — live Inspiring Advisor + Alumni chips with `started_at → ended_at` tooltip.
5. Routes in `src/App.tsx`.
6. All mutations go through `supabase.rpc(...)`. No direct `.insert()/.update()/.delete()` on consulting/organization tables from the client.

## Files touched

```text
scripts/seed-system-principal.ts                        NEW
supabase/migrations/<ts>_growth_journey.sql             NEW
src/pages/ConsultingGrowth.tsx                          NEW
src/pages/BrandEntity.tsx                               NEW
src/App.tsx                                             +2 routes
src/hooks/useNextBestActions.tsx                        +2 stage labels
src/components/dashboard/DashboardNextSteps.tsx         group renderer + title switch
src/components/profile/…                                Inspiring Advisor + Alumni chips
```

## Verification

1. Bootstrap script inserts system principal; migration seeds B4 with `created_by = system user_id`, `state='active'`. Missing principal → migration fails cleanly.
2. `staging2@box4solutions.com` dashboard shows "Your Growth Journey" with Consulting card.
3. Illegal transitions (`identified → won`, `scheduled → paid`) rejected. Legal path succeeds.
4. `record_paid_mission` called twice returns the same `declaration_mission_id`; single `consulting.mission.paid` event; declaration's `currency_code` and `client_id` copied from the mission.
5. `progression_milestone_progress('first_ten_missions')` returns correct percent after N paid missions.
6. Brand "AngryPenguin & Co" created in `forming`; activation returns `{activated:true, failures:[], warnings:[]}` → `active`; B4 assigned deterministically.
7. **Rollback test**: raise inside `_assign_partner` → no organization, no assignments, no declaration entity change, no events.
8. Admin override on a mission transition creates a `service_function_overrides` row with actor + reason; owner-initiated transitions do not.
9. Deactivated prior role renders as Alumni.

## Deliberately deferred

- Multi-brand per user (schema-ready).
- Distribution logic beyond existing 70/30.
- Sales analytics on extended opportunity funnel.
- Firm Growth / Ecosystem stages (data-ready).
