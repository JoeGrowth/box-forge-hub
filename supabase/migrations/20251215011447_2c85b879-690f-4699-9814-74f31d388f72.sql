-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;