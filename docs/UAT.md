# Box 4 Solutions — User Acceptance Testing (UAT)

Purpose: validate that the finished system works for real users and real business workflow.
Scope: production-like environment, real data entry, no developer assistance during execution.

## 1. Test participants (personas)

| ID | Persona | Real-world profile | Account state needed |
|----|---------|--------------------|----------------------|
| P1 | New user | Just signed up, nothing declared | Fresh account |
| P2 | Shaped talent | Finished Talent Foundation set | Intent + NR Decoder + track records + resume done |
| P3 | Initiator | Owns at least 1 approved idea | Vaccinated Initiator |
| P4 | Co-builder | Approved, member of 1+ venture | Vaccinated Co Builder |
| P5 | Organization admin | Admin of an org (e.g. Zomita) | Org + declaration entity |
| P6 | Box manager / advisor | Assigned to a box | Box role approved |
| P7 | Platform admin | Full admin | Admin role |

## 2. Entry criteria
- All features deployed to preview/production.
- Test accounts for P1–P7 exist with the stated states.
- Email delivery configured and monitored.
- Known open bugs listed and accepted as out-of-scope.

## 3. Exit criteria
- 100% of Critical scenarios pass.
- ≥ 95% of High scenarios pass.
- No open Critical/High defect without a fix or accepted workaround.
- Business owner signs section 8.

## 4. Severity definitions
- **Critical** — blocks a core business workflow, data loss, or wrong permissions/visibility.
- **High** — workflow completes but with wrong data, wrong labels, or heavy friction.
- **Medium** — cosmetic or UX degradation with a workaround.
- **Low** — copy, spacing, nice-to-have.

## 5. UAT scenarios

Each scenario: run on desktop (1480px) and phone (390px). Record Pass/Fail + evidence (screenshot).

### A. Onboarding & Shaping — P1
| # | Scenario | Expected business outcome | Sev |
|---|----------|---------------------------|-----|
| A1 | Sign up, land on homepage | Navbar shows only **Ladder** and **Studio**; no People/Organizations | Critical |
| A2 | Declare your intent | Intent saved; step checked in Shape your talent | Critical |
| A3 | Decode natural role (7 questions) | Role result stored and displayed on profile | High |
| A4 | Fill Professional Track Record | Data persists after reload | High |
| A5 | Sharpen resume with AI | Output respects word limits, Absolute Mode tone, no emojis | High |
| A6 | Fill Entrepreneurial Track Record | Talent Foundation set becomes checked | Critical |
| A7 | After A6 | "Shaped" tab disappears, "Developed" appears; navbar unlocks Ecosystem | Critical |
| A8 | Ecosystem menu order | Projects, People, Opportunities — Projects uses rocket icon | Medium |

### B. Studio / Venture lifecycle — P3, P4
| # | Scenario | Expected outcome | Sev |
|---|----------|------------------|-----|
| B1 | Create a startup idea through the guided flow | Idea saved as draft, not publicly visible | Critical |
| B2 | Submit for admin review (P7 approves) | Status moves to approved; idea appears in Opportunities | Critical |
| B3 | Episode 1 Develop → generate AI summary | Summary covers Idea Foundation questions; no filler/emojis | High |
| B4 | Episode 2 Validate → summary | Covers Validation + Monetization | High |
| B5 | Episode 3 Growth → summary | Covers Systemization + Scale | High |
| B6 | Team Building: search and add self | Initiator can add themselves | High |
| B7 | Add co-builders respecting caps | MVCB ≤ 3, MMCB ≤ 2, MLCB ≤ 1 enforced with clear message | Critical |
| B8 | Co-builder added | Welcome email received by the right person only | Critical |
| B9 | Negotiate compensation as initiator | Role line shown, equity/cliff/vesting definitions visible; can edit any member | Critical |
| B10 | Same dialog as co-builder (P4) | Can only negotiate own package; others read-only | Critical |
| B11 | Download Part 1 Foundation PDF | Equity & Responsibility rendered as a table, branded layout | High |
| B12 | Apply to a venture role as P4 | Application appears in initiator's management UI; accept/reject works | Critical |
| B13 | Card action order | Organization, Team, Episodes, View | Low |

### C. Organizations — P5
| # | Scenario | Expected outcome | Sev |
|---|----------|------------------|-----|
| C1 | Open /org/:slug on desktop | All tabs on one row; on phone tabs wrap in grid, readable | Medium |
| C2 | Edit organization description | Syncs to /organizations list and to the Legacy project | High |
| C3 | Project Journey: add a Product Journey (2) | Multiple product journeys coexist; iterations saved | High |
| C4 | Add 3+ shipped iterations | Card colour changes to the "repeatable" maturity code; collapsible works | Medium |
| C5 | People: add Friend (name only visible) | Contact/age/events stored but hidden on card | High |
| C6 | Drag Friend → Crew | Dialog opens to complete crew details (presence, crew type) | High |
| C7 | Drag Crew → Mentor | Mentor forced to "With expertise" | High |
| C8 | Crew drill-down | Click Crew → categories (Chouch Ward, Ch3ir, Helba) → member cards | High |
| C9 | People stats | Max activities / max years are maximums, not sums | High |
| C10 | 1000+ friends dataset | Search debounced, pagination/load-more responsive under 2s | Critical |
| C11 | Tender: contractor submits deliverable (/my-tender-work) | Manager sees submission, can accept/refuse, payment state updates | Critical |
| C12 | Presentations | "Onboarding Presentation" can be added under Presentations | Low |

### D. Money — P5
| # | Scenario | Expected outcome | Sev |
|---|----------|------------------|-----|
| D1 | Mission Setup: client, title, iteration, budget | Saved and listed | Critical |
| D2 | Charges: enter 5% on a 3000 budget | Amount auto = 150 | Critical |
| D3 | Charges: enter 150 | % auto = 5% | Critical |
| D4 | Number inputs | Scrolling never changes values; "0" clears on focus | High |
| D5 | Declaration → Money Box | Roles and Profit Distribution grouped inside Money Box | Medium |
| D6 | Profit split settings | Single associé = 100%; adding associé 2 rebalances; Recognition capped at 45% | Critical |
| D7 | Available balance label | Reads "Available in <Org> Account" | Low |
| D8 | Inflow > 100 for an admin org | "Add your organization" milestone auto-checks | High |

### E. Boxes, roles & admin — P6, P7
| # | Scenario | Expected outcome | Sev |
|---|----------|------------------|-----|
| E1 | Request advisor / box manager role | Request appears in admin Box Role Requests panel | Critical |
| E2 | Admin approves | box_advisors / box_ecosystem_admins updated; user sees Boxes in navbar | Critical |
| E3 | Reclaim an advisor | Status set inactive; access removed immediately | Critical |
| E4 | Assign box admin by full name | Profile dropdown search works | High |
| E5 | Pending-approval user (any onboarding state) | Appears in Admin → To check | Critical |
| E6 | Box badge | Achievements show Box badge and 8/8 total | Low |
| E7 | Manage your box card | Replaces Shape your talent once 4 milestones complete; Ladder replaced by Boxes | High |

### F. Cross-cutting — all personas
| # | Scenario | Expected outcome | Sev |
|---|----------|------------------|-----|
| F1 | Log in as P4 and try to open another user's edit surfaces | Blocked by permissions, no data leak | Critical |
| F2 | Messages: tabs All/Unread/Ventures/Direct | Correct filtering, context header, date grouping | High |
| F3 | Commitments on homepage | Checkpoint timeline, log checkpoint, cancel/reset all work | High |
| F4 | Kanban pipeline | Drag People/Products/Organizations persists after reload | High |
| F5 | Portfolio tree | Groups collapse/expand, entities and products correct | Medium |
| F6 | AI-generated text anywhere | Blunt, directive, no emojis, no motivational filler | High |
| F7 | Terminology audit | "Vaccinated" used; no "B4 Model Based" anywhere | High |
| F8 | Phone pass (390px) on every page above | No horizontal scroll, no clipped labels | High |
| F9 | Email flows | Sender domain valid, links resolve to box4solutions.com | Critical |

## 6. Execution log template

| Scenario | Tester | Date | Device | Result | Defect ID | Notes |
|----------|--------|------|--------|--------|-----------|-------|
| A1 | | | | Pass/Fail | | |

## 7. Defect log template

| ID | Scenario | Severity | Description | Steps to reproduce | Status | Owner |
|----|----------|----------|-------------|--------------------|--------|-------|
| D-001 | | | | | Open | |

## 8. Sign-off

| Role | Name | Decision (Accept / Accept with conditions / Reject) | Date |
|------|------|------|------|
| Business owner | | | |
| Platform admin | | | |
| UAT lead | | | |

Conditions / accepted defects:
