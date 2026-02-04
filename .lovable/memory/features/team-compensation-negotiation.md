# Memory: features/team-compensation-negotiation
Updated: 2026-02-04

## Overview
The Team Building phase now includes a comprehensive compensation negotiation system between initiators and co-builders.

## Database Schema
- **team_compensation_offers**: Stores active compensation offers per team member
  - monthly_salary (optional), salary_currency
  - time_equity_percentage, cliff_years, vesting_years (time-based equity)
  - performance_equity_percentage, performance_milestone (performance-based equity)
  - current_proposer_id, status (pending/accepted), version
- **team_compensation_history**: Tracks all negotiation rounds with full snapshots

## Compensation Structure
1. **Monthly Salary** (Optional): Covers living expenses, reduces equity risk
2. **Time-Based Equity** (Required if no performance): Cliff period + vesting schedule for retention
3. **Performance-Based Equity** (Optional): Unlocked after board-verified milestone

## Negotiation Flow
1. Initiator adds co-builders to team (existing functionality)
2. Initiator clicks "Set Compensation" to propose initial offer
3. Co-builder receives notification (in-app + email)
4. Co-builder can Accept or Counter-Propose
5. Back-and-forth continues until both agree (unlimited rounds)
6. Final agreed terms shown with "Agreed" badge

## UI Components
- **CompensationDialog** (`src/components/idea/CompensationDialog.tsx`): Full compensation form with salary, time equity, performance equity sections
- **TeamMemberSearch**: Now shows compensation status badges and "Set Compensation" / "Negotiate" buttons
- **CoBuilderApplicationsSection**: Co-builders see pending offers with "Action Required" highlight when it's their turn

## Access Control
- Initiator: Can create/edit offers for their startup team members
- Co-builder: Can view and respond to offers for themselves
- Status badges show whose turn it is to respond
