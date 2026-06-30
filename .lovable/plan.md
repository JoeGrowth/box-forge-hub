
# Engine Access Gating — Implementation Plan

Gate the three engines off the existing graph projections (no new tables). Career stays open as the on-ramp; Consulting and Entrepreneurship show as visible-but-locked until the user earns the qualifying signals.

## 1. Access rules (single source of truth)

```text
Career
  unlocked = signed-in (always true post-auth)

Consulting
  unlocked = ANY of:
    - expertise_graph.verified_expertise_count >= 1
    - expertise_graph.expertise_score >= 8
    - revenue_graph.completed_transactions >= 1
    - advisor_readiness.is_ready = true
    - admin

Entrepreneurship
  unlocked = ANY of:
    - Vaccinated Co-Builder cert
    - Vaccinated Initiator cert
    - ownership_graph.total_allocated_equity > 0
    - reputation_graph.reputation_level in (recognized, expert, authority)
    - user already owns/co-owns a startup_idea (grandfather)
    - admin
```

Building / Founder remain status badges *inside* Entrepreneurship — not access tiers.

## 2. New hook: `useEngineAccess`

`src/hooks/useEngineAccess.tsx` — composes the existing hooks (`useExpertise`, `useReputation`, `useRevenue`, `useOwnership`, `useAdvisorReadiness`, `useAdmin`, plus a small query for owned `startup_ideas` and cert status). Returns:

```ts
type EngineKey = "career" | "consulting" | "entrepreneurship";
type EngineAccess = {
  unlocked: boolean;
  reasons: { met: string[]; missing: { label: string; cta: { label: string; to: string } }[] };
};
useEngineAccess(): { loading: boolean; engines: Record<EngineKey, EngineAccess> };
```

Reasons are human-readable evidence strings — never expose raw booleans.

## 3. Navbar changes

`src/components/layout/Navbar.tsx`:
- Always render Career / Consulting / Entrepreneurship links (no hiding).
- When `!unlocked`, append a small `Lock` icon (lucide), reduce opacity slightly, add a tooltip with the top missing signal.
- Locked link still navigates — to the engine page, which then shows the locked panel (not a 403, no redirect to /dashboard).
- Admins always see unlocked.

## 4. New component: `EngineLockedPanel`

`src/components/engines/EngineLockedPanel.tsx` — full-page panel rendered at the top of each engine page when locked. Props: `engine`, `reasons`. Shows:
- Title: "Not yet unlocked" (never "forbidden")
- "What this engine gives you" (1-line value prop)
- "Evidence required" list with checkmarks for met signals, empty circles for missing
- "Next actions" CTAs routing to: `/decoder`, `/resume`, `/track-record`, `/learning-journeys`, `/opportunities`, etc.
- "Already unlocked elsewhere?" link to support (no-op for now)

## 5. Engine pages

`src/pages/Career.tsx` — no gating change (open).
`src/pages/Consulting.tsx` and `src/pages/Entrepreneurship.tsx`:
- Call `useEngineAccess()`.
- If `loading`, show existing skeleton.
- If `!engines[key].unlocked`, render `<EngineLockedPanel ... />` instead of the dashboard.
- Otherwise render existing content unchanged.

No changes to deep child routes for now (e.g. `/start`, `/scale`, `/advisory`). Those continue to use their existing checks; we can fold them into `useEngineAccess` in a follow-up.

## 6. Capability gating (kept, not changed in this pass)

Inside Career we leave the existing sub-feature gates as-is (publish training, apply, etc. via `useAccessLevel`). This plan only adds engine-level gating; nothing existing gets loosened.

## Technical notes

- All reads come from existing tables: `expertise_graph`, `reputation_graph`, `revenue_graph`, `ownership_graph`, `advisor_readiness`, `user_certifications`, `startup_ideas`, `startup_team_members`. No migration needed.
- Cert detection: read `user_certifications` for the two Vaccinated cert keys already used in the certification data mapping.
- Grandfathering: `startup_ideas.created_by = user.id` OR row in `startup_team_members.member_user_id = user.id`.
- Cache `useEngineAccess` results in component state; re-runs on auth change. No localStorage cache (graph state changes too often and we don't want stale locks).
- Admin bypass uses existing `useAdmin`.

## Files touched

- add `src/hooks/useEngineAccess.tsx`
- add `src/components/engines/EngineLockedPanel.tsx`
- edit `src/components/layout/Navbar.tsx` (lock icon + tooltip on the 3 engine links)
- edit `src/pages/Consulting.tsx` (render locked panel when locked)
- edit `src/pages/Entrepreneurship.tsx` (render locked panel when locked)

## Out of scope (next pass if you want)

- Locking sub-routes like `/scale`, `/advisory`, `/start` directly (today they're reachable via other links).
- Tracking unlock events to `click_events` / `graph_events` for funnel analytics.
- Email nudge when a user crosses an unlock threshold.
