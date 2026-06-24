## Problem

Youssef received a "New Co-Builder Application" notification for Houssem Ali but clicking it sent him to `/profile`, where no application UI is rendered. Two recent notifications in the DB confirm `link = '/profile'`.

Root cause: the trigger added in the previous migration (`notify_creator_on_startup_application`) hard-codes `link = '/profile'` and does not include the application id. The frontend `ApplyToJoinDialog` already links correctly to `/chat/{applicationId}`, but the trigger fires in parallel and overrides the experience with a useless `/profile` link.

## Fix

### 1. Update the DB trigger to deep-link to the application

New migration replacing `public.notify_creator_on_startup_application` so it writes:

```
link = '/chat/' || NEW.id
```

This opens `src/pages/Chat.tsx` (route `/chat/:applicationId`), which:
- loads the application + startup,
- shows Houssem's cover message and role,
- lets Youssef accept/reject and chat — exactly what he expected from the notification.

Also remove the duplicate `INSERT` that `ApplyToJoinDialog` already performs (the frontend writes its own `user_notifications` + `admin_notifications` rows). Keeping both produces two notifications per application. The trigger should only fire as a safety net when the frontend insert is skipped — gate it with `NOT EXISTS` on a matching recent notification for the same creator/applicant/startup, so we never double-notify.

### 2. Backfill Youssef's two broken notifications

The two `/profile` notifications dated `2026-06-24 12:02:09` (user `1238d855-…`) have no surviving `startup_applications` row to point at. Update those rows to `link = '/start?section=myideas'` so the click lands on his Ideas section where he can open Team management; mark them so they're visibly the same notification he already saw.

### 3. Verify

- Re-read the two updated notification rows.
- Have Houssem (or a test seed) submit a new application against one of Youssef's ideas; confirm exactly one `user_notifications` row is created with `link = '/chat/<application_id>'`.
- Visit `/chat/<application_id>` as Youssef and confirm the page loads (no redirect to `/profile`).

## Files touched

- `supabase/migrations/<new>.sql` — replace trigger function, dedupe insert, backfill the two broken rows.
- No frontend changes required (`ApplyToJoinDialog` already uses the correct `/chat/{id}` link).
