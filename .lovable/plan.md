# Growth Journey — Final Plan (v4)

Incorporates all 8 refinements on top of v3, plus a concrete seed so **staging2@box4solutions.com** sees the new actions in practice on next login.

---

## 1. Schema refinements (on top of v3)

### 1.1 Normalize predicates (replaces `progression_rules.predicates jsonb`)

```text
progression_rules              (metadata only)
  id, slug, stage, title, description, priority, active

progression_rule_predicates    (NEW — join table)
  id, rule_id FK, predicate_id FK, argument text, evaluation_order int
  UNIQUE (rule_id, evaluation_order)
```

`evaluate_rule(rule_id, user_id)` iterates predicates ordered by `evaluation_order`, AND-combined, dispatched via static `CASE handler` (no dynamic SQL). Foreign keys guarantee predicate existence.

### 1.2 Status lookup tables (replace inline CHECK constraints)

```text
consultant_opportunity_statuses (slug PK, label, color, sort_order, terminal bool)
consultant_mission_statuses      (slug PK, label, color, sort_order, terminal bool)
```

`consultant_opportunities.status` and `consultant_missions.status` become FKs to these tables. Legal transitions still enforced by service functions (`transition_opportunity_status`, `transition_mission_status`). Labels/colors/localization become data.

### 1.3 Event ordering by identity

`graph_events` already has `id bigint identity`. Replay/consumers order by `id`, not `occurred_at` (which can tie). Add index `graph_events(aggregate_id, id)`.

### 1.4 Admin override audit fields

`admin_overrides` gets `reason text NOT NULL, actor_id uuid NOT NULL, target_table text, target_id uuid, previous_value jsonb, new_value jsonb`. Every service function that accepts an override path (`transition_mission_status(..., p_override_reason text default null)`) writes a row when the reason is non-null.

### 1.5 Milestone progress helper

```sql
create view progression_milestone_progress as
select user_id, milestone_slug, current_value, threshold,
       least(1.0, current_value::numeric / threshold) as percent_complete
from ...;
```

Frontend reads this view directly — never computes percentages.

### 1.6 Brand activation response contract

```json
{ "activated": false, "state": "validation", "failures": [], "warnings": [] }
```

`warnings[]` allows non-blocking recommendations (e.g., "no partner set yet — using default B4") without breaking the contract.

### 1.7 RPC-only write boundary

Frontend uses ONLY these RPCs (no direct table inserts/updates for the growth domain):

- `create_consultant_opportunity(payload jsonb)`
- `transition_opportunity_status(id, next_status, override_reason?)`
- `create_consultant_mission(opportunity_id, payload)`
- `transition_mission_status(id, next_status, override_reason?)`
- `record_paid_mission(id)` (idempotent)
- `create_brand_entity(payload)` / `activate_brand_entity(org_id)`
- `assign_entity_role(org_id, user_id, role_slug, reason?)` / `deactivate_entity_role(assignment_id, reason?)`

RLS on the underlying tables denies direct writes from `authenticated` (SELECT-only for owner reads); all mutations go through `SECURITY DEFINER` RPCs with owner checks.

### 1.8 Explicit performance metrics

`consultant_performance` view definitions (documented + tested):

```text
active_clients       := COUNT(DISTINCT dm.client_id)
                        WHERE dm.paid_at IS NOT NULL
                          AND dm.paid_at >= now() - interval '12 months'
total_revenue        := SUM(dm.amount)         WHERE dm.paid_at IS NOT NULL
avg_daily_rate       := AVG(cm.subtotal / NULLIF(cm.number_of_days,0))
                        WHERE cm.billing_model='daily_rate' AND cm.status='paid'
paid_missions_count  := COUNT(*)               WHERE cm.status='paid'
```

Sourced entirely from `declaration_missions` (revenue) and `consultant_missions` (delivery).

---

## 2. Files

- `scripts/seed-system-principal.ts` (NEW — bootstraps system auth user + `platform_principals.slug='system'`)
- `supabase/migrations/<ts>_growth_journey.sql` (NEW — all schema, RPCs, seed data for predicates/rules/milestones/statuses/partners, plus staging2 activation rows)
- `src/pages/ConsultingGrowth.tsx` (NEW)
- `src/pages/BrandEntity.tsx` (NEW)
- `src/App.tsx` (+2 routes)
- `src/hooks/useNextBestActions.tsx` (+2 action definitions)
- `src/components/dashboard/DashboardNextSteps.tsx` (retitle "Your Growth Journey" + Foundation/Growth/Future grouping)
- `src/components/profile/…` (Inspiring Advisor + Alumni chips)

---

## 3. Making it real for staging2@box4solutions.com

The migration includes a **guarded seed block** keyed by email so it only fires for this user in staging:

```sql
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email='staging2@box4solutions.com';
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Ensure prerequisites recorded as milestones (intent, natural role,
  -- track record, sharpened resume) so consulting_growth rule unlocks.
  INSERT INTO progression_graph (user_id, milestone_slug, reached_at)
  VALUES
    (v_uid,'intent_defined',        now()),
    (v_uid,'natural_role_defined',  now()),
    (v_uid,'track_record_filled',   now()),
    (v_uid,'resume_sharpened',      now())
  ON CONFLICT DO NOTHING;

  PERFORM recompute_progression(v_uid);
END $$;
```

After migration, on next dashboard load Houssem sees under **Your Growth Journey → Growth**:

1. **Grow your consulting practice** → routes to `/consulting-growth` (Pipeline · Delivery · Accounting · Performance sections; opportunity sources include LinkedIn & Tender).
2. **Launch your brand entity** → routes to `/brand-entity` (locked with tooltip "Unlocks after 10 paid missions — 0/10").

Once he books 10 paid missions via `record_paid_mission`, the Brand card unlocks; on activation B4 is auto-assigned as **Inspiring Advisor** and the new org appears in `/organizations`.

---

## 4. Verification (against staging2 account)

1. Log in as staging2 → dashboard shows "Your Growth Journey", Foundation collapsed & checked, Growth open with "Grow your consulting practice" surfaced.
2. `/consulting-growth`: create opportunity (source=LINKEDIN) → mission (billing_model=daily_rate, 5 days, 800/day) → transitions scheduled→in_progress→delivered→accepted → `record_paid_mission` → declaration auto-created, counter 1/10, `consulting.mission.paid` event visible.
3. Call `record_paid_mission` twice on same mission → second call is no-op (idempotent), no duplicate declaration.
4. Seed 10 paid missions → Brand card unlocks; consulting card still shown with cumulative metrics.
5. `create_brand_entity('AngryPenguin & Co')` → state=`forming` → `activate_brand_entity` returns `{activated:true, warnings:[]}` → org appears in `/organizations`; B4 listed as Inspiring Advisor; declaration entity attached.
6. Rollback test: force `_assign_partner` failure → no org, no role assignments, no graph_events.
7. Deactivate a prior role → renders as Alumni with dates on profile.

---

## 5. Deliberately deferred

Multi-brand per user, 70/30 profit split beyond existing wallet, sales-funnel analytics, Firm Growth (multiple advisors, products catalog), Ecosystem stage.
