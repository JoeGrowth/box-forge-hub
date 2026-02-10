ALTER TABLE public.admin_notifications DROP CONSTRAINT admin_notifications_notification_type_check;

ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'natural_role_help'::text, 
  'practice_help'::text, 
  'training_help'::text, 
  'application_submission'::text, 
  'approval_granted'::text, 
  'approval_rejected'::text, 
  'opportunity_approved'::text, 
  'opportunity_rejected'::text, 
  'entrepreneur_review_request'::text, 
  'user_ready'::text, 
  'nr_help_requested'::text, 
  'scaling_candidate'::text,
  'user_stuck'::text
]));