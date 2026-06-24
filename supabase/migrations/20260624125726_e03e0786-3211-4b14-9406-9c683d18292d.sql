
CREATE OR REPLACE FUNCTION public.notify_creator_on_startup_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_title text;
  v_applicant_name text;
  v_already_notified boolean;
BEGIN
  SELECT creator_id, title INTO v_creator_id, v_title
  FROM public.startup_ideas
  WHERE id = NEW.startup_id;

  IF v_creator_id IS NULL OR v_creator_id = NEW.applicant_id THEN
    RETURN NEW;
  END IF;

  -- Skip if the frontend already inserted a notification for this application
  SELECT EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE user_id = v_creator_id
      AND notification_type = 'application_received'
      AND link = '/chat/' || NEW.id::text
      AND created_at >= now() - interval '5 minutes'
  ) INTO v_already_notified;

  IF v_already_notified THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'A co-builder') INTO v_applicant_name
  FROM public.profiles
  WHERE user_id = NEW.applicant_id;

  INSERT INTO public.user_notifications (user_id, notification_type, title, message, link)
  VALUES (
    v_creator_id,
    'application_received',
    'New Co-Builder Application',
    COALESCE(v_applicant_name, 'A co-builder') ||
      ' applied to join your startup "' || COALESCE(v_title, 'your idea') || '"' ||
      CASE WHEN NEW.role_applied IS NOT NULL THEN ' as ' || NEW.role_applied ELSE '' END ||
      '. Review the application now.',
    '/chat/' || NEW.id::text
  );

  BEGIN
    INSERT INTO public.admin_notifications (user_id, notification_type, user_name, message)
    VALUES (
      v_creator_id,
      'application_received',
      COALESCE(v_applicant_name, 'A co-builder'),
      COALESCE(v_applicant_name, 'A co-builder') || ' applied to "' || COALESCE(v_title, 'idea') || '"' ||
        CASE WHEN NEW.role_applied IS NOT NULL THEN ' for role: ' || NEW.role_applied ELSE '' END || '.'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Repair Youssef's two broken notifications (link='/profile')
UPDATE public.user_notifications
SET link = '/start?section=myideas'
WHERE notification_type = 'application_received'
  AND link = '/profile';
