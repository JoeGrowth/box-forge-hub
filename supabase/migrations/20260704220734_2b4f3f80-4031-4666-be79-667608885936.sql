-- Allow admins to insert notifications for any user (e.g. when approving a learning journey).
CREATE POLICY "Admins can insert notifications for any user"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill the missing approval notification for the user whose Initiator journey was approved
-- but never received a notification because of the previous RLS gap.
INSERT INTO public.user_notifications (user_id, notification_type, title, message, link)
SELECT
  uc.user_id,
  'journey_approved',
  'Journey Approved!',
  'You''ve earned the "' || uc.display_label || '" certification.',
  '/journey'
FROM public.user_certifications uc
WHERE uc.certification_type = 'initiator_b4'
  AND uc.user_id = 'c9594985-3edc-4f96-bea7-849741e34a68'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = uc.user_id
      AND n.notification_type = 'journey_approved'
      AND n.created_at > uc.earned_at - interval '1 minute'
  );