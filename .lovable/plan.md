# Consolidation Plan — One Growth Engine

## Core model

Users don't pick a product. They pick **what they're growing**:

- **Talent** (was: Career + Consulting)
- **Idea** (was: Entrepreneurship)

Both flow through the same 5-stage engine:

```
Foundation → Validation → Monetization → Systemization → Scale
```

Career / Consulting / Entrepreneurship stop being top-level destinations. They become **outcome labels** on stages:

| Stage         | Talent track                        | Idea track                    |
| ------------- | ----------------------------------- | ----------------------------- |
| Foundation    | Intent, Natural Role, Resume        | Concept, 5 Elements           |
| Validation    | Projects delivered, Reputation      | Market fit, Approval          |
| Monetization  | Consulting missions, Revenue        | First paying users            |
| Systemization | Methods, Frameworks, Knowledge      | Playbooks, Ops                |
| Scale         | Team, Products, Impact              | Growth, Distribution          |

Labels retained for continuity:
- "Career" = Talent Foundation + Validation
- "Consulting" = Talent Monetization
- "Entrepreneurship" = the Idea track

## Terminology (locked)

Stage names in UI: **Foundation · Validated · Monetized · Grown · Scaled**
(matches existing Entrepreneurship tab labels — least churn.)

Track names: **Your Talent** · **Your Idea**

## Staged migration

### Stage 1 — Navigation + mental model (this pass)
- Replace top-nav "People / Projects / Assets / More" with:
  - **Grow Talent** → dropdown listing the 5 stages (links to existing pages)
  - **Grow an Idea** → dropdown listing the 5 stages
  - **Opportunities** (kept)
  - **More** (People, Organizations, Boxes, Programs, Paths, Squares)
- No route changes yet. Each stage entry deep-links to the current page that owns that stage.
- Add a `/grow` hub page: two columns (Talent / Idea), each showing 5 stages with the user's current status pulled from `useProgressionLadder`.

### Stage 2 — Unified progression dashboard
- Rework `/dashboard` around the two tracks. Kill the "Career vs Consulting vs Entrepreneurship" mental split in `DashboardHero`, `DashboardProgress`, `NextGoalBanner`.
- `useProgressionLadder` already models 6 stages — collapse to the 5-stage model and expose it as `useGrowthEngine({ track: "talent" | "idea" })`.

### Stage 3 — Route consolidation
- New canonical routes:
  - `/talent/foundation`, `/talent/validated`, `/talent/monetized`, `/talent/grown`, `/talent/scaled`
  - `/idea/foundation`, `/idea/validated`, `/idea/monetized`, `/idea/grown`, `/idea/scaled`
- Existing routes (`/career`, `/consulting`, `/consulting-growth`, `/entrepreneurship`, `/scale`, `/start-scaling`, `/start-structuring`) become redirects to the correct stage.
- Update every internal `<Link>` and `navigate(...)` call. Sitemap + SEO metadata refreshed.

### Stage 4 — Copy + IA cleanup
- Replace "Career Engine / Consulting Engine / Entrepreneurship Engine" copy with "Talent track / Idea track" wording across pages, cards, empty states.
- Remove duplicate stage descriptions; each stage owns one canonical page.

## What does NOT change

- No feature deletion. Every existing page stays reachable.
- No schema changes. `progression_graph`, `consultant_opportunities`, `startup_ideas`, `user_roles` untouched.
- Gating rules (`GatedRoute`, `useEngineAccess`) keep working — the engines just get renamed in the UI.

## Rollout order

1. Stage 1 (nav + `/grow` hub) — shippable in one pass, immediately communicates the new mental model.
2. Stage 2 (dashboard) — once nav is live.
3. Stage 3 (routes) — after dashboard, because it's the biggest link-sweep.
4. Stage 4 (copy) — cleanup pass.

Awaiting go-ahead to start Stage 1.
