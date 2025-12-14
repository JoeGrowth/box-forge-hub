-- Add DELETE policy for admin_notifications table (only admins can delete)
CREATE POLICY "Only admins can delete notifications"
ON public.admin_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));