

## Unified Opportunity Feed — Implementation Plan

### What Changes

Replace the current fragmented Opportunities page (separate sections for startups, trainings, tenders, environments with different card layouts) with a single unified feed of structured opportunity cards, each with one primary action.

### Data Model

Create a unified `Opportunity` interface used client-side to normalize all sources:

```text
Opportunity {
  id: string
  title: string
  category: "job" | "consulting" | "tender" | "startup" | "training"
  required_skills: string[]        // 3-5 tags
  income_range: string             // e.g. "Equity-based", "Paid", "Free"
  effort_level: string             // e.g. "Full-time", "Part-time", "Self-paced"
  description: string
  primary_action: { type: "apply" | "join" | "start", label: string, route: string }
  source_id: string                // original DB id
  created_at: string
  author_name: string
  sector: string | null
  rank: number                     // manual sort priority
}
```

No database migration needed. The unified structure is assembled client-side from existing `startup_ideas` and `training_opportunities` tables, plus the hardcoded B4 certification programs.

### Mapping Rules

| Source | Category | primary_action | income_range | effort_level |
|--------|----------|---------------|-------------|-------------|
| startup_ideas | "startup" | `{ type: "apply", route: "/opportunities/{id}" }` | "Equity-based" | "Part-time" |
| training_opportunities | "training" | `{ type: "start", route: "#" }` (no deep link) | "Free" | "Self-paced" |
| B4 certifications | "training" | `{ type: "start", route: "/journey" }` | "Free" | "Self-paced" |
| (future) tenders | "tender" | placeholder | — | — |
| (future) jobs | "job" | placeholder | — | — |

`required_skills` for startups: derived from `roles_needed` (capped at 5). For trainings: derived from sector + target_audience. For B4 programs: hardcoded tags.

### Ranking (Static)

Order: B4 certifications first (rank 0-3), then startups sorted by `created_at` desc (rank 10+), then community trainings (rank 100+). Tenders/jobs placeholders at bottom.

### UI Structure

**File: `src/pages/Opportunities.tsx`** — full rewrite.

1. **Header** — Keep existing title/subtitle.
2. **Category filter bar** — Horizontal pill buttons: All, Startup, Training, Consulting, Tender, Job. Single select. No deep search — remove the sector filter input. Keep the search input for title/description text match only.
3. **Unified feed** — Single vertical list of `OpportunityCard` components. No grid, no sections. One card layout for all categories.
4. **Remove**: Stats dashboard (KPI boxes), separate section headers, separate card layouts per type.

**New component: `src/components/opportunities/OpportunityCard.tsx`**

Consistent card structure:
- Category badge (color-coded: teal=startup, blue=training, orange=consulting, gray=tender/job)
- Title
- Description (2-line clamp)
- Skills tags row (3-5 badges)
- Bottom row: income_range | effort_level | single primary_action button
- No secondary actions, no "View opportunity" ghost links

**Remove**: `DashboardOpportunities.tsx` dependency on old structure (will need import update if it references Opportunities types).

### Files Modified

1. **`src/pages/Opportunities.tsx`** — Rewrite: unified feed with single card type, category filter, text search, static ranking
2. **`src/components/opportunities/OpportunityCard.tsx`** — New: single card component for all opportunity types
3. **`src/components/dashboard/DashboardOpportunities.tsx`** — Minor: keep as-is (it queries startup_ideas directly, independent)

### What Gets Removed

- Grid layout per category
- Separate B4 certification cards section
- Separate community trainings section  
- Sector filter input
- Stats dashboard (4 KPI boxes)
- "Add Idea" button in the filter bar
- "Coming Soon" placeholder pages for tenders/environments
- "Environments" category tab

