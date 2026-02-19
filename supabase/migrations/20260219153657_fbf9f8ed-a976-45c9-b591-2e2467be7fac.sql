
-- Fix: Replace overly permissive notification insert policy
DROP POLICY IF EXISTS "Users can insert notifications for others" ON public.user_notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);
