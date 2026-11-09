# B4 Phase 1 — Stabilization and Commercial Readiness

**Planning only. Reviewing or approving this plan does not authorize implementation.** Code, database records, configuration and existing business data remain unchanged. Each release requires a separate explicit implementation instruction.

The detailed report is available in Files as **B4_Phase_1_Stabilization_Plan_2026-11-09.md**. It contains the full issue-by-issue impact analysis, backlog, architecture, migration strategy, regression tests, rollback procedures, pilot requirements and founder decisions.

## Verified starting point

All 33 existing tests passed; they do not cover security or delivery/payment flows. Confirmed source/catalog risks include bulk deletion authorization, an active signup trigger trusting role metadata, user-writable deletion challenges, caller-selected notifications, permissive message updates, and missing stable financial links. Eight duplicate model-name groups remain. Hosted endpoint settings, actual password login/reset delivery, hostile security flows, provider eligibility and recovery are unverified. Saved scans are historical/overlapping; intentional public discovery must not be blanket-locked.

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

Preserve Admin, Box Manager, Entrepreneur, Co-Builder and Guest. Separate platform roles, organization permissions, responsibilities, certifications, growth evidence, economic allocations and legal ownership. Keep Sales organization-admin-only; contributors negotiate only their own compensation and confirm only their own receipts.

Protect current-user onboarding loading and prevent stale responses/state. Keep personal assessment private and optional. Pause expansion of modules, frameworks, marketplace, AI/graph features, payroll/tax, bank sync and legal-equity automation—not existing data or credentials. Certification-gate changes need approval.

## Priority 4 — Six-week pilot

Propose three consulting/training organizations with real delivery, a named admin and 2–10 contributors. Start after security/recovery gates. Week 1 setup/team/baseline; week 2 opportunity/proposal/project/split; week 3 delivery; week 4 collection/payables; week 5 transfers/confirmations/reconciliation; week 6 outcomes/renewal/export.

Manual first: setup, proposal acceptance, invoices, payment checks, transfers, tax, disputes, legacy mapping, subscriptions and customer success. No fund custody or claimed live bank balances.

Proposed—not observed—targets: two of three activated in week 1, meaningfully active in week 4 and completing accepted delivery/reconciliation by week 6; every approved allocation balanced; zero private tenant exposure; measure administrative time against baseline. Externally delayed collection is reported, not counted as success.

Propose organization subscriptions with manual invoices. Founder sets price/limits; provider integration waits for eligibility checks. Subscription fees stay separate from mission platform fees.

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

After authorization: inventory/back up securely, rehearse restore, add nullable IDs and normalized approved financial lines with explicit grants/RLS. Keep a legacy mapping registry and historical amounts/JSON/source keys. Names and paid flags never prove beneficiary identity or cash.

Review duplicates before archiving; shadow-compare organization/currency/beneficiary totals; cut over one pilot with one authoritative writer, idempotency and version locks. Keep compatibility readers; no old table/column removal in Phase 1. Preserve committed payments and use reversals. Security rollback fails closed; database restoration cannot undo external identity deletion/transfers atomically.

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
