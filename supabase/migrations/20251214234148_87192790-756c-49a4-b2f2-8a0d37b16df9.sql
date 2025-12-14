-- Drop the existing check constraint on notification_type
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_notification_type_check;

-- Add updated check constraint with ALL notification types (existing + new)
ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_notification_type_check 
CHECK (notification_type IN (
  'natural_role_help', 
  'practice_help', 
  'training_help', 
  'application_submission',
  'approval_granted',
  'approval_rejected',
  'opportunity_approved',
  'opportunity_rejected',
  'entrepreneur_review_request',
  'user_ready',
  'nr_help_requested',
  'scaling_candidate'
));