# P0 Activation & Retention Fixes

Four critical fixes to remove the activation leaks and progression fragmentation flagged in the audit.

---

## 1. Unify Onboarding (one entry, one completion event)

**Keep:** `/onboarding` (compressed flow) as the single activation funnel.
**Convert:** the legacy 9-step flow into post-activation *progressive enrichment* under `/track`.

### Route changes
- `/professional-onboarding` → rename to `/professional-track`
- `/entrepreneurial-onboarding` → rename to `/entrepreneurial-track`
- `/choose-path` → redirect to `/onboarding` (path is now picked inside the compressed flow, if not already)
- Old URLs (`/professional-onboarding`, `/entrepreneurial-onboarding`, `/choose-path`) → 301-style `<Navigate replace>` to new targets so bookmarks/emails don't break.

### Semantics
- `/onboarding` writes the single `onboarding_completed = true` event → activation metric.
- `/professional-track` and `/entrepreneurial-track` become **optional enrichment** pages (no `onboarding_completed` gating). They feed signals into the Professional Growth Path, not activation.
- Remove the "must finish 9 steps" redirect logic from `Onboarding.tsx` and `ChoosePath.tsx`.

### Files
- `src/App.tsx` — route table updates + redirect shims
- `src/pages/ChoosePath.tsx` — replace body with `<Navigate to="/onboarding" replace />`
- `src/pages/Onboarding.tsx` — drop the `/choose-path` bounce; treat compressed flow as canonical
- Any internal `<Link to="/professional-onboarding">` / `/entrepreneurial-onboarding` / `/choose-path` references (grep + update)

---

## 2. Pending-State Partial Access

Stop dead-ending pending users. They get **read + save + recommendations**; they cannot **publish or apply**.

### Gating helper
New hook `useAccessLevel()` returning:
- `level: 'guest' | 'pending' | 'approved' | 'admin'`
- `can.browse`, `can.save`, `can.receiveRecs` → true for `pending+`
- `can.publish`, `can.apply` → true for `approved+`

Backed by existing `onboarding_state` + `user_roles` — no new tables.

### UI changes
- `/opportunities`, `/cobuilders`, `/boxes`, dashboard recommendations: allow pending users in.
- Apply / Publish buttons for pending users: render disabled with tooltip "Available once your profile is approved" + link to `/profile` to complete enrichment.
- Pending banner in `DashboardHero` with ETA + "Boost your approval" CTA → `/professional-track`.
- `Save opportunity` already works via `useSavedOpportunities` — just unblock the route guard.

### Files
- `src/hooks/useAccessLevel.tsx` (new)
- `src/components/layout/ProtectedRoute.tsx` (new — see §4)
- `src/components/opportunities/OpportunityCard.tsx` — disable Apply CTA when `!can.apply`
- `src/pages/Opportunities.tsx`, `CoBuilders.tsx` — remove `approved`-only gate
- `src/components/dashboard/DashboardHero.tsx` — pending banner

---

## 3. Canonical Progression Stream — `next_best_action(user_id)`

One source of truth. Every surface (Dashboard Next Steps, ProgressionPathCard, OpportunityCard explanations, Growth Loops sidebar, Lifecycle hints) reads from it.

### Approach
- Reuse existing `progression_graph` + `useNextBestActions` — they already materialize ranked actions.
- Add a thin facade hook `useNextBestAction(userId, { surface, limit })` that returns the same NBA list filtered/sorted per surface (e.g. dashboard wants top 3, ProgressionPathCard wants stage-relevant, OpportunityCard wants 1 matching the listing's category).
- Migrate consumers:
  - `DashboardNextSteps` → use facade (drop its local heuristics)
  - `ProgressionPathCard` → already uses `useNextBestActions`; keep but route through facade
  - `GrowthLoopsCard` → render top-1 NBA above its own content; defer to NBA when both compete
  - `OpportunityCard` → its `RecommendationExplanation` already comes from NBA payload; ensure no parallel computation
  - `OpportunityLifecycle` hints → consume NBA via facade

### Files
- `src/hooks/useNextBestAction.tsx` (new facade)
- `src/components/dashboard/DashboardNextSteps.tsx`
- `src/components/profile/ProgressionPathCard.tsx`
- `src/components/profile/GrowthLoopsCard.tsx`
- `src/components/opportunities/OpportunityCard.tsx` (only if it computes locally)

No DB migration — the projection already exists.

---

## 4. Protected Routes (no auth flash)

Single `<ProtectedRoute>` wrapper that:
- Renders nothing (or a skeleton) while `authLoading`.
- Redirects to `/auth?next=<current>` when no user — **before** the page mounts.
- Optional `requireLevel="approved" | "pending" | "any"` prop using `useAccessLevel`.

### Files
- `src/components/layout/ProtectedRoute.tsx` (new)
- `src/App.tsx` — wrap authenticated routes (`/dashboard`, `/profile`, `/resume`, `/scale`, `/advisory`, `/opportunities`, `/journey`, `/track`, `/admin`, `/messages`, `/chat`, `/onboarding`, `/professional-track`, `/entrepreneurial-track`, etc.)
- Remove per-page `useEffect(() => { if (!user) navigate('/auth') }, ...)` duplication (Dashboard, Profile, Onboarding, ChoosePath, …) — keep one source of truth.

---

## Verification
- Build clean (`tsc --noEmit`).
- Playwright: hit `/professional-onboarding` → expect redirect to `/professional-track`; hit `/profile` while logged out → expect `/auth` (no flash).
- Manually flip a test user to `pending`, confirm `/opportunities` loads with Apply disabled.

## Out of scope (deferred)
- Rename "Potential Equity %" → "Equity Readiness"
- Public `/u/:slug` profile
- Splitting god-pages
- Live aggregates replacing hardcoded landing stats
