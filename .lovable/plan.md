# Add advisor removal to admin Boxes tab

## What we will build
A remove action next to each advisor in `AdminBoxesTab` so an admin can reclaim a person from being a Box advisor.

## Why
The admin UI currently supports appointing advisors but not removing them. The only way to reclaim someone is to edit `box_advisors` directly in the database.

## Changes
1. **Frontend — `src/components/admin/AdminBoxesTab.tsx`**
   - Add a trash/remove icon button next to each advisor in the "Advisors Linked" list.
   - On click, update the matching `box_advisors` row to `status = 'inactive'` and `accepting_requests = false`.
   - Show a confirmation toast and refresh the advisors list.

## Behavior
- Removal is soft: status becomes `inactive`, the row is preserved for history.
- The existing query filters for `status = 'active'`, so the advisor disappears from the list immediately.
- Only the UI is changing; no database migration is needed.
