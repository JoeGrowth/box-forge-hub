# Organization descriptions in Ideas

## Goal
Let organization editors and admins add or update the description on `/org/:slug`, then show that organization description on its linked card in `/ideas`.

## Changes
- Allow both editors and admins to use the existing description editor in the organization header.
- When saved, update the organization and its linked startup idea so both views stay aligned.
- In `/ideas`, resolve linked organizations and prefer their current description, with the idea description as a fallback.
- Keep existing permissions, card layout, and legacy links unchanged.

## Verification
- Confirm an editor can see the Add/Edit description action.
- Confirm saving updates the organization header and the matching `/ideas` card.
- Confirm `/ideas` still loads normally when an idea has no linked organization.
