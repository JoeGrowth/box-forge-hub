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
BEGIN
  SELECT creator_id, title INTO v_creator_id, v_title
  FROM public.startup_ideas
  WHERE id = NEW.startup_id;

  IF v_creator_id IS NULL OR v_creator_id = NEW.applicant_id THEN
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
    '/profile'
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

DROP TRIGGER IF EXISTS trg_notify_creator_on_startup_application ON public.startup_applications;
CREATE TRIGGER trg_notify_creator_on_startup_application
AFTER INSERT ON public.startup_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_creator_on_startup_application();

INSERT INTO public.user_notifications (user_id, notification_type, title, message, link)
SELECT
  si.creator_id,
  'application_received',
  'New Co-Builder Application',
  COALESCE(p.full_name, 'A co-builder') ||
    ' applied to join your startup "' || si.title || '"' ||
    CASE WHEN sa.role_applied IS NOT NULL THEN ' as ' || sa.role_applied ELSE '' END ||
    '. Review the application now.',
  '/profile'
FROM public.startup_applications sa
JOIN public.startup_ideas si ON si.id = sa.startup_id
LEFT JOIN public.profiles p ON p.user_id = sa.applicant_id
WHERE sa.created_at >= now() - interval '7 days'
  AND si.creator_id <> sa.applicant_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_notifications un
    WHERE un.user_id = si.creator_id
      AND un.notification_type = 'application_received'
      AND un.message LIKE '%' || si.title || '%'
  );