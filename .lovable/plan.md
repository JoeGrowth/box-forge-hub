# Concrete Implementation Plan — Next 90 Days

Derived from the Product + Business audit. Five workstreams, sequenced. Each item lists scope, files/tables touched, and acceptance criteria.

---

## Workstream 1 — Focus the Wedge (Weeks 1–2)

**Goal:** New users land on one core loop: *Initiator posts idea → Co-Builder applies*. Everything else moves behind a "More" menu or feature flag.

### 1.1 Simplify navbar
- Keep: Engine dropdown, Opportunities, Publish, Profile.
- Move behind "More" overflow: Boxes, Programs, Advisory, OpsManagement, Mask, 3S, Track, Checklist.
- File: `src/components/layout/Navbar.tsx`.

### 1.2 Rename obscure routes (keep old as redirects)
- `/3S` → `/structuring`
- `/mask` → `/brand-identity`
- File: `src/App.tsx` (add `<Navigate>` redirects).

### 1.3 New-user landing focus
- After signup completion, default dashboard tile = "Post an Idea" (Initiator) or "Browse Ideas" (Co-Builder).
- File: `src/components/dashboard/DashboardHero.tsx`.

**Acceptance:** A new user reaches "post idea" or "apply to idea" in ≤2 clicks from dashboard.

---

## Workstream 2 — Monetization v1 (Weeks 2–5)

**Goal:** First revenue stream live. Pick **Procuring subscription** (lowest legal risk, clear value).

### 2.1 Pricing model
- Free: view tenders.
- Procuring Entity (€49/mo): post unlimited tenders, see applicant track records.
- Vaccinated Fast-Track (€99 one-time): priority admin review (<48h) for certification.

### 2.2 Stripe integration
- Use Lovable's built-in Stripe (recommend_payment_provider → enable_stripe_payments).
- New table `subscriptions(user_id, plan, status, current_period_end, stripe_customer_id, stripe_subscription_id)`.
- Edge function `stripe-webhook` to sync status.
- Gate `/procuring` post-tender button on `subscriptions.status='active' AND plan='procuring_entity'`.

### 2.3 Billing UI
- New page `src/pages/Billing.tsx` — current plan, upgrade CTAs, invoice history (Stripe portal link).
- Add "Upgrade" badge in navbar profile dropdown when no active sub.

**Acceptance:** A user can subscribe via Stripe Checkout, webhook flips status to active, tender posting unlocks. End-to-end test passes.

---

## Workstream 3 — Onboarding Funnel (Weeks 3–5, parallel)

**Goal:** Reduce 9 steps + 4 flags to ≤5 steps to first value. Instrument the funnel.

### 3.1 Instrumentation
- Add PostHog (`posthog-js`). Track events: `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_abandoned`, `first_idea_posted`, `first_application_submitted`.
- File: new `src/lib/analytics.ts`, fire from each step component in `src/components/onboarding/steps/`.

### 3.2 Step consolidation
- Merge `ProfileInfoStep` + `NaturalRoleDefinitionStep` into one screen (tabbed).
- Move `PendingHelpStep` out of main flow → dashboard banner.
- Make `AssessmentSteps` optional/deferrable with "Complete later" CTA stored in `onboarding_state.deferred_assessment=true`.

### 3.3 First-value milestone
- On completion, route Initiator directly to `CreateIdeaDialog` open, Co-Builder directly to `/opportunities?category=startup`.
- File: `src/components/onboarding/steps/CompletionStep.tsx`.

**Acceptance:** Median steps from signup to first idea/application drops from 9 → ≤5. Funnel chart visible in PostHog.

---

## Workstream 4 — Data Model Hardening (Weeks 4–7)

**Goal:** Single canonical user state. Stop drift across 6 status fields.

### 4.1 Canonical enum
- Migration: create `user_lifecycle_stage` enum: `signed_up | onboarded | natural_role_defined | vaccinated | active_builder | initiator | consultant`.
- Add `profiles.lifecycle_stage` column. Backfill from existing fields with deterministic precedence.

### 4.2 Deprecate legacy fields
- Mark `potential_role`, `boost_type`, `scale_type` as deprecated in code comments. Add read-shim in `useUserStatus.tsx`. Plan removal in Q+1.

### 4.3 RLS audit on new tables
- Run `supabase--linter` on: `tenders`, `consultant_opportunities`, `ops_*`, `subscriptions`.
- Verify GRANT statements and policies for each. Add server-side PII filtering view `public.cobuilder_directory_public` (exclude email/phone).

**Acceptance:** All public-schema tables pass linter. `lifecycle_stage` populated for 100% of profiles. One source of truth in `useUserStatus`.

---

## Workstream 5 — Quality, Performance, Observability (Weeks 6–10)

### 5.1 Test coverage on critical flows (Vitest + Playwright)
- Vitest unit: `useUserStatus`, `useOnboarding`, match-score computation.
- Playwright e2e: signup → onboarding → post idea, signup → apply to idea, subscribe → post tender.
- File: new `tests/` directory, `playwright.config.ts`.

### 5.2 Error tracking
- Add Sentry (`@sentry/react`). DSN as secret. Wrap App in `Sentry.ErrorBoundary`.

### 5.3 Query performance
- Convert `Opportunities.tsx` client-side fetch+filter to Postgres RPC `get_opportunities(category, search, user_id)` with server-side capacity filtering and pagination (limit 20).
- Add indexes: `startup_ideas(status, created_at desc)`, `tenders(status, created_at desc)`, `user_skills(user_id)`.

### 5.4 Component refactor
- Split `Opportunities.tsx`, `Resume.tsx`, `Scale.tsx` into ≤300-line components. Extract data hooks to `src/hooks/`.

**Acceptance:** 5 e2e tests green in CI. Sentry receives test error. `/opportunities` P95 load <800ms with 1000 rows seeded.

---

## Sequencing & Dependencies

```text
Week:  1  2  3  4  5  6  7  8  9  10
W1 Focus:    ████
W2 $$$:         ██████████
W3 Onbd:           ████████
W4 Data:                 ████████
W5 QA:                        ████████
```

W1 has no blockers. W2 blocked on Stripe enablement. W4 should land before W5 query refactor.

---

## Out of Scope (defer to Q+1)

- Mobile app
- AI matchmaking v2
- Multi-language (EN/FR/AR)
- Public SEO pre-rendering (needs SSR migration — separate plan)
- Tender legal review (engage lawyer in parallel, not a code workstream)

---

## Risks

| Risk | Mitigation |
|---|---|
| Stripe webhook misses events | Use Stripe CLI replay + idempotent handler keyed on `event.id` |
| Onboarding instrumentation skews funnel during rollout | Tag events with `app_version`, compare cohorts |
| Lifecycle backfill mis-maps users | Dry-run in staging, ship migration with rollback SQL |
| Procuring subscription gets <10 paying users | Pivot W2 to Vaccinated fast-track fee (same Stripe plumbing) |
