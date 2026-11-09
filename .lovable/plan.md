# B4 Phase 1 — Stabilization and Commercial Readiness

**Planning only. Reviewing or approving this plan does not authorize implementation.** Code, database records, configuration and existing business data remain unchanged. Each release requires a separate explicit implementation instruction.

The detailed report is available in Files as **B4_Phase_1_Stabilization_Plan_2026-11-09.md**. It contains the full issue-by-issue impact analysis, backlog, architecture, migration strategy, regression tests, rollback procedures, pilot requirements and founder decisions.

## Verified starting point

- All 33 existing tests passed across five files. They do not establish security or delivery/payment coverage.
- Account deletion checks admin authority only when the request declares an admin action, while bulk target arrays are independently used.
- The active signup function assigns roles from user-editable metadata. This is an additional release blocker beyond the earlier audit.
- Deletion challenges can be inserted/updated by their user, lack action/target binding, use weak randomness and may be returned when email fails.
- Notification recipients and authoritative notification types are caller-selected after login.
- Invitations lack durable entity authorization; message update policies rely on conversation participation rather than authorship.
- Background/diagnostic handlers lack in-handler caller checks; current deployed gateway and scheduler settings remain unverified.
- Sales documents and opportunities lack stable links to each other and to projects. Distribution records and declaration missions are separate concepts.
- Eight duplicate organization/model-name groups remain, with eight excess models. Same names alone are not sufficient evidence to delete them.
- Project save can create a shipped delivery before acceptance; model selection and some earnings attribution still depend on names.
- Customer payment flags and personal bank confirmations are not a verified cash ledger.

Saved scans contain overlapping historical findings. They are triage evidence, not a fresh count of exploitable defects. Intended public networking/catalog visibility must be preserved rather than blanket-restricted.

**Not verified:** live password sign-in, reset-email delivery, production endpoint settings, hostile signup/deletion/message tests, provider eligibility, recovery drill or workload capacity. No destructive production tests were performed.

## Priority 1 — Security remediation

Treat confirmed critical authorization defects as release blockers.

1. Derive actor and target authorization on the server; ordinary self-service cannot use bulk targets or select another account.
2. Preserve emailed six-digit deletion confirmation, but use cryptographic generation, server-only storage, actor/action/target binding, durable limits and atomic single-use consumption. Never expose codes through responses/logs.
3. Ignore signup metadata for privileges. Protect admin-assigned roles and certification/status approvals; separate editable answers from protected entitlements.
4. Derive notification recipients/content from authorized committed business events; use durable retries and idempotency.
5. Verify invitation sender permissions and recipient-bound acceptance; preserve existing declaration-owner and organization-admin scopes.
6. Make message/conversation identity immutable; separate sender edits from recipient read receipts.
7. Require verified internal worker identity, admin diagnostics and authenticated/quota-limited paid AI. Verify scheduler compatibility before changing worker access.
8. Escape email content, restrict links and redact sensitive logs.
9. Verify cross-organization access and storage/RPC boundaries using isolated users/tenants; preserve approved public profiles, ideas and safe organization discovery.

Every issue in the detailed report specifies affected files/functions, root cause, correction, side effects, regression tests and acceptance evidence. No security finding has been marked fixed or ignored.

## Priority 2 — Delivery and financial architecture

Propose **declaration missions as the canonical financial mission anchor**, enriched with organization, project, client, product and proposal IDs. Distribution pages remain draft preparation and publish approved allocation snapshots into that source. This is a proposal requiring founder approval.

```text
Client → Opportunity → Accepted proposal → Project → Mission
                                            └→ Product delivery/acceptance
Mission → Versioned allocation → Earned entitlement → Payable
Customer receipt → Explicit mission application
Contributor payment → Explicit payable application
Individual bank confirmation → Independent receipt assertion
Reconciliation → Exceptions, reversals and audit evidence
```

- Stable IDs replace names, positional payees and encoded context strings.
- Product-linked, versioned templates have one constrained default per organization/product; intentional alternatives remain valid.
- Only accepted deliveries count as new shipments. Historical anomalies require review, not deletion.
- Published allocations are immutable; amendments and payments use explicit versions/reversals.
- Reserve applies to the full budget. In the supplied example: 1,000 budget − 160 core team − 100 reserve = **740 Operation Task Force**.
- Third-party charges and reserve are not divided among people. Reject over-allocation rather than treating a zero-clamped pool as balanced.
- UI, PDF, declarations and earnings read the same authorized snapshot.
- Preserve statement-based associate Recognition, current cap/threshold and historical totals until an approved policy changes them.
- Keep customer collection, generated entitlement, payable, payer transfer and recipient bank confirmation distinct. Never fabricate payment records from existing paid flags.
- Decide future TND precision, threshold currency meaning, tax basis and payable-release terms before financial cutover.

## Priority 3 — Product simplification

Preserve Admin, Box Manager, Entrepreneur, Co-Builder and Guest as B4's five user-facing types. Keep platform roles, organization permissions, responsibilities, certifications, growth evidence, economic allocations and legal ownership separate.

Keep Sales admin-only for organization editing. Contributors negotiate only their own compensation and confirm only their own bank receipts. No certification, title or equity percentage automatically grants organization authority.

Preserve current-user onboarding loading and prevent delayed previous-user responses from overwriting new state. Fix personal-assessment state reset; defer new financial-advice/cloud-sync scope.

Pause new modules, frameworks, marketplace expansion, graph/AI feature expansion, payroll/tax, bank sync, automated legal-equity claims and microservices. Pause expansion—not existing data, journeys or earned credentials. Any bypass of certification gates needs separate approval.

## Priority 4 — Six-week pilot

Proposed cohort: three small consulting/training organizations with real collaborative delivery, a named admin and approximately 2–10 contributors each. Start only after security and recovery gates.

- Week 1: organization/legal/billing setup, team permissions and baseline measurements.
- Week 2: real opportunity, accepted proposal, linked project/mission and valid allocation.
- Week 3: delivery milestones, blockers and acceptance evidence.
- Week 4: customer collection/payable review; explain externally delayed collection explicitly.
- Week 5: contributor transfers, personal confirmations and reconciliation.
- Week 6: outcomes, renewal evidence, support burden and data export.

Manual first: onboarding, proposal acceptance, invoicing, payment verification, bank transfers, taxes, disputes, legacy mapping, subscriptions and weekly customer success. B4 does not hold funds or claim live bank balances.

Proposed success targets: two of three activated in week 1; two complete accepted delivery/reconciled split by week 6; two meaningfully active in week 4; every approved allocation balanced; no private tenant exposure; measure a proposed 30% administrative-time reduction against actual baselines. Targets are not current results.

Propose organization subscriptions with manual invoicing initially. Founder chooses price/limits; provider integration waits for seller-country and service eligibility checks. SaaS subscription fees remain separate from mission platform-fee allocations.

## Priority 5 — Independently testable releases

| Release | Scope | Dependencies | Acceptance / safe rollback |
|---|---|---|---|
| R1A | Account deletion/challenges, safe signup roles, protected approvals | Isolated test accounts; deletion/retention decisions | Negative and legitimate lifecycle tests pass. Disable unsafe actions if needed; never restore vulnerable controls. |
| R1B | Notifications, invites, messages, worker/AI perimeter and tenant checks | R1A authority; verified scheduler identity | Unauthorized calls have no effects; permitted sends/jobs/chat work. Preserve queues/history; deny unsafe access on rollback. |
| R2 | Canonical links, template uniqueness and reliable saves/user state | Security gates; restore rehearsal; canonical anchor approval | Parallel/retry creation cannot duplicate; failures visible. Preserve links/data and revert safe reads through adapters. |
| R3 | Accepted deliveries and authoritative allocation snapshots | R2; rounding/tax/Recognition policy | Budget/identity/PDF/earnings parity. Pause approvals and preserve snapshots; use reversals, not deletion. |
| R4 | Customer receipts, payables, contributor payments, reconciliation | R3; due/release/evidence policies | Complete partial-payment fixture flow reads back. Pause posting and reconcile committed entries; retain all money evidence. |
| R5 | Pilot setup, manual subscriptions, export, support and recovery | R1–R4 gates; commercial choices and named operators | Reproducible full pilot flow and recovery evidence. Honor paid terms manually and preserve secure workspace access. |

The report supplies affected files/database entities, migrations, security controls, test plans and rollback criteria for every release.

## Migration and rollback

Additive changes only after authorization. Inventory and securely back up affected schema/records; rehearse restore. Add nullable IDs, constrained server commands and normalized approved financial lines with explicit grants/RLS.

Maintain a legacy-to-canonical mapping registry with provenance. Never infer beneficiaries or confirmed cash from names/booleans. Review duplicates/content/references before archiving candidates. Preserve historical JSON, source keys and amounts.

Run shadow comparisons per organization/currency/beneficiary, then cut over one pilot organization. Use one authoritative writer, idempotency and version locks. Keep legacy compatibility readers. No old table/column removal in Phase 1.

Financial rollback preserves committed entries and uses compensating records. A database restore is not an atomic undo of identity deletion or external transfers. Security rollback must fail closed.

## Proposed 30-day implementation window

Day 1 begins only after explicit authorization. Assumes two experienced engineers, shared QA/security review and a founder/customer-success owner; a single engineer needs a longer schedule.

- Days 1–5: R1A and recovery/test foundations.
- Days 4–8: R1B with parallel security review.
- Days 9–12: R2 stable links and reliable saves.
- Days 13–18: R3 accepted delivery, calculations and snapshots.
- Days 19–24: R4 cash/payables/reconciliation.
- Days 25–27: R5 pilot operations/subscription readiness.
- Days 28–30: role/tenant/mobile/regression tests, realistic workload and restore/incident drill; go/no-go.

Failed gates delay the pilot; the schedule is not permission to waive blockers or a guaranteed delivery date.

## Founder decisions before implementation

Confirm release authorization, canonical mission anchor, deletion/retention policy, payable-release terms, currency precision/threshold/tax basis, financial approval rights, shipment meaning, subscription price/limits, certification/onboarding changes, pause list, legal/provider eligibility and recovery/support owners.

**Next recommended instruction:** explicitly authorize R1A only, after its deletion/retention and confirmation-code policies are agreed. Reviewing this plan is not that authorization.
